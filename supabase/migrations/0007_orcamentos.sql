-- 0007 — Orçamentos e itens do orçamento
create sequence if not exists public.orcamentos_numero_seq;
grant usage, select on sequence public.orcamentos_numero_seq to authenticated;

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default nextval('public.orcamentos_numero_seq'), -- ORC-0001
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  validade date, -- preenchida pela configuração se vier vazia
  prazo_entrega date,
  -- Desconto: em R$ ou %, sempre com motivo
  desconto_tipo text not null default 'valor' check (desconto_tipo in ('valor', 'percentual')),
  desconto_valor numeric(10, 2) not null default 0 check (desconto_valor >= 0),
  desconto_motivo text,
  -- Frete: repassado (soma no total) ou absorvido pela loja (vira custo)
  frete_valor numeric(10, 2) not null default 0 check (frete_valor >= 0),
  frete_repassado boolean not null default true,
  -- Sinal: auto (regra de Configurações), forcar (sempre) ou sem (nunca)
  sinal_modo text not null default 'auto' check (sinal_modo in ('auto', 'forcar', 'sem')),
  sinal_percentual numeric(5, 2) check (sinal_percentual is null or (sinal_percentual > 0 and sinal_percentual <= 100)),
  observacao text,
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  enviado_em timestamptz,
  aprovado_em timestamptz,
  aprovado_por text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint desconto_com_motivo check (desconto_valor = 0 or length(trim(coalesce(desconto_motivo, ''))) > 0),
  constraint desconto_percentual_max check (desconto_tipo <> 'percentual' or desconto_valor <= 100)
);
create index if not exists orcamentos_cliente on public.orcamentos (cliente_id);

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  ordem integer not null default 0,
  produto_id uuid references public.produtos (id) on delete set null,
  variacao_id uuid references public.variacoes (id) on delete set null,
  descricao text not null check (length(trim(descricao)) > 0), -- "Copo Stanley 473 ml — Preto" (guardado)
  detalhe text, -- o que gravar: nome, logo, posição…
  quantidade integer not null check (quantidade >= 1),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0), -- faixa + acréscimo no momento
  adicional numeric(10, 2) not null default 0 check (adicional >= 0), -- por unidade
  item_do_cliente boolean not null default false,
  mockup jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
create index if not exists orcamento_itens_orcamento on public.orcamento_itens (orcamento_id);

-- Validade padrão = hoje + dias de Configurações
create or replace function public.orcamento_validade_padrao()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.validade is null then
    new.validade := current_date + coalesce((select validade_dias from configuracoes where id), 7);
  end if;
  return new;
end $$;
drop trigger if exists validade_padrao on public.orcamentos;
create trigger validade_padrao before insert on public.orcamentos
  for each row execute function public.orcamento_validade_padrao();

drop trigger if exists auditoria on public.orcamentos;
create trigger auditoria before insert or update on public.orcamentos
  for each row execute function public.preencher_auditoria();
drop trigger if exists auditoria on public.orcamento_itens;
create trigger auditoria before insert or update on public.orcamento_itens
  for each row execute function public.preencher_auditoria();

alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
drop policy if exists "logados: tudo" on public.orcamentos;
create policy "logados: tudo" on public.orcamentos for all to authenticated using (true) with check (true);
drop policy if exists "logados: tudo" on public.orcamento_itens;
create policy "logados: tudo" on public.orcamento_itens for all to authenticated using (true) with check (true);

-- Totais (mesma regra de app/src/lib/orcamento.ts)
create or replace function public.orcamento_totais(p_orcamento uuid)
returns table (
  subtotal numeric, desconto numeric, frete numeric, total numeric, quantidade integer,
  pede_sinal boolean, sinal_percentual numeric, valor_sinal numeric, valor_restante numeric
)
language sql stable set search_path = public as $$
  with o as (select * from orcamentos where id = p_orcamento),
  c as (select * from configuracoes where id),
  i as (
    select coalesce(sum(quantidade * (preco_unitario + adicional)), 0) as subtotal,
           coalesce(sum(quantidade), 0)::int as quantidade
    from orcamento_itens where orcamento_id = p_orcamento
  ),
  t as (
    select i.subtotal, i.quantidade,
           least(i.subtotal, case when o.desconto_tipo = 'percentual' then round(i.subtotal * o.desconto_valor / 100, 2) else o.desconto_valor end) as desconto,
           o.frete_valor as frete, o.frete_repassado, o.sinal_modo,
           coalesce(o.sinal_percentual, c.sinal_percentual, 50) as pct,
           c.sinal_valor_minimo, c.sinal_qtd_minima
    from o, i left join c on true
  ),
  t2 as (
    select t.*, t.subtotal - t.desconto + case when t.frete_repassado then t.frete else 0 end as total
    from t
  ),
  t3 as (
    select t2.*,
      case t2.sinal_modo
        when 'forcar' then true
        when 'sem' then false
        else (t2.sinal_valor_minimo is not null and t2.total >= t2.sinal_valor_minimo)
          or (t2.sinal_qtd_minima is not null and t2.quantidade >= t2.sinal_qtd_minima)
      end as pede
    from t2
  )
  select subtotal, desconto, frete, total, quantidade, pede, pct,
         case when pede then round(total * pct / 100, 2) else 0 end,
         case when pede then total - round(total * pct / 100, 2) else total end
  from t3
$$;

-- Lista com cliente, totais e situação (expirado = venceu sem resposta)
create or replace view public.orcamentos_lista with (security_invoker = true) as
select o.id, o.numero, o.status, o.validade, o.prazo_entrega, o.created_at, o.updated_at, o.cliente_id,
       coalesce(nullif(cl.nome_fantasia, ''), cl.nome) as cliente_nome,
       t.total, t.quantidade, t.pede_sinal, t.valor_sinal,
       case when o.status in ('rascunho', 'enviado') and o.validade < current_date then 'expirado' else o.status end as situacao
from orcamentos o
join clientes cl on cl.id = o.cliente_id
cross join lateral orcamento_totais(o.id) t;

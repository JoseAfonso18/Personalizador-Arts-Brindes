-- 0010 — Pedidos: criados ao aprovar o orçamento; quadro aprovado → gravando → pronto → entregue
create sequence if not exists public.pedidos_numero_seq;
grant usage, select on sequence public.pedidos_numero_seq to authenticated;

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default nextval('public.pedidos_numero_seq'), -- PED-0001
  origem text not null default 'orcamento' check (origem in ('orcamento', 'venda_rapida')),
  orcamento_id uuid unique references public.orcamentos (id) on delete set null,
  cliente_id uuid references public.clientes (id) on delete restrict, -- vazio = consumidor (venda rápida)
  status text not null default 'aprovado' check (status in ('aprovado', 'gravando', 'pronto', 'entregue', 'cancelado')),
  prazo_entrega date,
  nota_venda text, -- número da NF emitida no portal do MEI
  observacao text,
  -- Valores guardados no momento da aprovação
  subtotal numeric(10, 2) not null default 0,
  desconto numeric(10, 2) not null default 0,
  frete numeric(10, 2) not null default 0,
  frete_repassado boolean not null default true,
  total numeric(10, 2) not null default 0,
  sinal_percentual numeric(5, 2),
  valor_sinal numeric(10, 2) not null default 0,
  entregue_em timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
create index if not exists pedidos_status on public.pedidos (status);
create index if not exists pedidos_cliente on public.pedidos (cliente_id);

create table if not exists public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  ordem integer not null default 0,
  produto_id uuid references public.produtos (id) on delete set null,
  variacao_id uuid references public.variacoes (id) on delete set null,
  descricao text not null,
  detalhe text,
  quantidade integer not null check (quantidade >= 1),
  preco_unitario numeric(10, 2) not null default 0,
  adicional numeric(10, 2) not null default 0,
  item_do_cliente boolean not null default false,
  mockup jsonb
);
create index if not exists pedido_itens_pedido on public.pedido_itens (pedido_id);

-- Histórico: quem mudou o status e quando
create table if not exists public.pedido_historico (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  de text,
  para text not null,
  em timestamptz not null default now(),
  por uuid references auth.users (id),
  por_nome text -- quando não há usuário (ex.: cliente aprovou pelo link)
);
create index if not exists pedido_historico_pedido on public.pedido_historico (pedido_id);

drop trigger if exists auditoria on public.pedidos;
create trigger auditoria before insert or update on public.pedidos
  for each row execute function public.preencher_auditoria();

-- Registra o histórico e a data de entrega
create or replace function public.pedido_status_mudou()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'entregue' then
    update pedidos set entregue_em = coalesce(entregue_em, now()) where id = new.id and entregue_em is null;
  end if;
  insert into pedido_historico (pedido_id, de, para, por, por_nome)
  values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid(),
          case when auth.uid() is null and tg_op = 'INSERT' then
            (select aprovado_por from orcamentos where id = new.orcamento_id) end);
  return new;
end $$;
drop trigger if exists status_mudou on public.pedidos;
create trigger status_mudou after insert or update of status on public.pedidos
  for each row execute function public.pedido_status_mudou();

-- Cria o pedido a partir de um orçamento aprovado (copia itens e valores)
create or replace function public.criar_pedido_de_orcamento(p_orcamento uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pedido uuid;
  t record;
begin
  select id into v_pedido from pedidos where orcamento_id = p_orcamento;
  if v_pedido is not null then return v_pedido; end if;
  select * into t from orcamento_totais(p_orcamento);
  insert into pedidos (origem, orcamento_id, cliente_id, prazo_entrega, observacao, subtotal, desconto, frete, frete_repassado, total, sinal_percentual, valor_sinal)
  select 'orcamento', o.id, o.cliente_id, o.prazo_entrega, o.observacao, t.subtotal, t.desconto, t.frete, o.frete_repassado, t.total,
         case when t.pede_sinal then t.sinal_percentual end, t.valor_sinal
  from orcamentos o where o.id = p_orcamento
  returning id into v_pedido;
  insert into pedido_itens (pedido_id, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup)
  select v_pedido, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup
  from orcamento_itens where orcamento_id = p_orcamento;
  return v_pedido;
end $$;
revoke all on function public.criar_pedido_de_orcamento(uuid) from public, anon;

create or replace function public.orcamento_aprovado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    perform criar_pedido_de_orcamento(new.id);
  end if;
  return new;
end $$;
drop trigger if exists ao_aprovar on public.orcamentos;
create trigger ao_aprovar after update of status on public.orcamentos
  for each row execute function public.orcamento_aprovado();

-- Orçamentos que já estavam aprovados ganham pedido
select public.criar_pedido_de_orcamento(id) from public.orcamentos o
where status = 'aprovado' and not exists (select 1 from public.pedidos p where p.orcamento_id = o.id);

alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.pedido_historico enable row level security;
drop policy if exists "logados: tudo" on public.pedidos;
create policy "logados: tudo" on public.pedidos for all to authenticated using (true) with check (true);
drop policy if exists "logados: tudo" on public.pedido_itens;
create policy "logados: tudo" on public.pedido_itens for all to authenticated using (true) with check (true);
drop policy if exists "logados: ler" on public.pedido_historico;
create policy "logados: ler" on public.pedido_historico for select to authenticated using (true);

-- Lista do quadro
create or replace view public.pedidos_lista with (security_invoker = true) as
select p.id, p.numero, p.origem, p.status, p.prazo_entrega, p.total, p.valor_sinal, p.created_at, p.entregue_em, p.orcamento_id, p.cliente_id,
       coalesce(nullif(cl.nome_fantasia, ''), cl.nome, 'Consumidor') as cliente_nome,
       (select coalesce(sum(quantidade), 0)::int from pedido_itens i where i.pedido_id = p.id) as quantidade,
       (select string_agg(i.quantidade || '× ' || i.descricao, ' · ' order by i.ordem) from pedido_itens i where i.pedido_id = p.id) as resumo,
       (p.prazo_entrega < current_date and p.status in ('aprovado', 'gravando', 'pronto')) as atrasado
from pedidos p
left join clientes cl on cl.id = p.cliente_id;

-- Funções internas (gatilhos): ninguém chama pela API; os gatilhos continuam funcionando
revoke all on function public.criar_pedido_de_orcamento(uuid) from public, anon, authenticated;
revoke all on function public.orcamento_aprovado() from public, anon, authenticated;
revoke all on function public.pedido_status_mudou() from public, anon, authenticated;

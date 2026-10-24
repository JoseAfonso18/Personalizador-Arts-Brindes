-- 0002 — Produtos, faixas de preço por quantidade e variações (cores)
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run.

create extension if not exists btree_gist with schema extensions;

-- Produto: o que vendemos. "servico_gravacao" = cliente traz o item (sem estoque).
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null default 'produto' check (tipo in ('produto', 'servico_gravacao')),
  ativo boolean not null default true,
  observacao text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

-- Faixa de preço: preço unitário para um intervalo de quantidade.
-- qtd_max vazio = "ou mais". Faixas do mesmo produto não podem se sobrepor.
create table if not exists public.faixas_preco (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  qtd_min integer not null check (qtd_min >= 1),
  qtd_max integer check (qtd_max is null or qtd_max >= qtd_min),
  preco numeric(10, 2) not null check (preco >= 0),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint faixas_sem_sobreposicao exclude using gist (
    produto_id with =,
    int4range(qtd_min, qtd_max, '[]') with &&
  )
);

create index if not exists faixas_preco_produto on public.faixas_preco (produto_id);

-- Variação: a cor de um produto, com estoque próprio e acréscimo opcional no preço.
create table if not exists public.variacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  acrescimo numeric(10, 2) not null default 0 check (acrescimo >= 0),
  estoque integer not null default 0,
  estoque_minimo integer not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  unique (produto_id, nome)
);

create index if not exists variacoes_produto on public.variacoes (produto_id);

-- Serviço de gravação não tem cor nem estoque
create or replace function public.variacao_so_em_produto()
returns trigger language plpgsql as $$
begin
  if (select tipo from public.produtos where id = new.produto_id) <> 'produto' then
    raise exception 'Serviço de gravação não tem variações (cores)';
  end if;
  return new;
end $$;

drop trigger if exists variacao_so_em_produto on public.variacoes;
create trigger variacao_so_em_produto
  before insert or update on public.variacoes
  for each row execute function public.variacao_so_em_produto();

-- Auditoria (quem criou / quem alterou) — função criada na 0001
drop trigger if exists auditoria on public.produtos;
create trigger auditoria before insert or update on public.produtos
  for each row execute function public.preencher_auditoria();
drop trigger if exists auditoria on public.faixas_preco;
create trigger auditoria before insert or update on public.faixas_preco
  for each row execute function public.preencher_auditoria();
drop trigger if exists auditoria on public.variacoes;
create trigger auditoria before insert or update on public.variacoes
  for each row execute function public.preencher_auditoria();

-- Acesso: só usuários logados, e todos veem e editam tudo
alter table public.produtos enable row level security;
alter table public.faixas_preco enable row level security;
alter table public.variacoes enable row level security;

drop policy if exists "logados: tudo" on public.produtos;
create policy "logados: tudo" on public.produtos for all to authenticated using (true) with check (true);
drop policy if exists "logados: tudo" on public.faixas_preco;
create policy "logados: tudo" on public.faixas_preco for all to authenticated using (true) with check (true);
drop policy if exists "logados: tudo" on public.variacoes;
create policy "logados: tudo" on public.variacoes for all to authenticated using (true) with check (true);

-- Preço unitário = preço da faixa da quantidade + acréscimo da cor.
-- Devolve vazio (null) se nenhuma faixa cobre a quantidade.
create or replace function public.preco_unitario(
  p_produto uuid,
  p_quantidade integer,
  p_variacao uuid default null
) returns numeric language sql stable as $$
  select f.preco + coalesce((select v.acrescimo from public.variacoes v
                             where v.id = p_variacao and v.produto_id = p_produto), 0)
  from public.faixas_preco f
  where f.produto_id = p_produto
    and p_quantidade >= f.qtd_min
    and (f.qtd_max is null or p_quantidade <= f.qtd_max)
$$;

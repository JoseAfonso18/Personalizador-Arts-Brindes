-- 0011 — Pagamentos do pedido (sinal, restante, parciais) e fiado (a prazo, só cliente de confiança)
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  valor numeric(10, 2) not null check (valor > 0),
  forma text not null check (forma in ('pix', 'dinheiro', 'cartao', 'boleto')),
  data date not null default current_date,
  observacao text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
create index if not exists pagamentos_pedido on public.pagamentos (pedido_id);

-- Fiado: data combinada para pagar o saldo
alter table public.pedidos add column if not exists vencimento date;

drop trigger if exists auditoria on public.pagamentos;
create trigger auditoria before insert or update on public.pagamentos
  for each row execute function public.preencher_auditoria();

-- Não deixa receber mais do que o total do pedido
create or replace function public.pagamento_dentro_do_total()
returns trigger language plpgsql set search_path = public as $$
declare v_total numeric; v_pago numeric;
begin
  select total into v_total from pedidos where id = new.pedido_id;
  select coalesce(sum(valor), 0) into v_pago from pagamentos where pedido_id = new.pedido_id and id <> new.id;
  if v_pago + new.valor > v_total then
    raise exception 'Valor maior que o saldo do pedido (falta %)', to_char(v_total - v_pago, 'FM999G999G990D00');
  end if;
  return new;
end $$;
drop trigger if exists dentro_do_total on public.pagamentos;
create trigger dentro_do_total before insert or update on public.pagamentos
  for each row execute function public.pagamento_dentro_do_total();

-- Fiado só para cliente de confiança
create or replace function public.fiado_so_confianca()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.vencimento is not null and new.vencimento is distinct from old.vencimento
     and not coalesce((select confianca from clientes where id = new.cliente_id), false) then
    raise exception 'Fiado só para cliente de confiança';
  end if;
  return new;
end $$;
drop trigger if exists fiado_confianca on public.pedidos;
create trigger fiado_confianca before update of vencimento on public.pedidos
  for each row execute function public.fiado_so_confianca();

alter table public.pagamentos enable row level security;
drop policy if exists "logados: tudo" on public.pagamentos;
create policy "logados: tudo" on public.pagamentos for all to authenticated using (true) with check (true);

-- Lista do quadro com a situação do pagamento
drop view if exists public.pedidos_lista;
create view public.pedidos_lista with (security_invoker = true) as
with base as (
  select p.*, coalesce((select sum(valor) from pagamentos g where g.pedido_id = p.id), 0) as pago
  from pedidos p
)
select b.id, b.numero, b.origem, b.status, b.prazo_entrega, b.total, b.valor_sinal, b.created_at, b.entregue_em, b.orcamento_id, b.cliente_id,
       b.vencimento, b.pago, b.total - b.pago as saldo,
       coalesce(nullif(cl.nome_fantasia, ''), cl.nome, 'Consumidor') as cliente_nome,
       (select coalesce(sum(quantidade), 0)::int from pedido_itens i where i.pedido_id = b.id) as quantidade,
       (select string_agg(i.quantidade || '× ' || i.descricao, ' · ' order by i.ordem) from pedido_itens i where i.pedido_id = b.id) as resumo,
       (b.prazo_entrega < current_date and b.status in ('aprovado', 'gravando', 'pronto')) as atrasado,
       case
         when b.status = 'cancelado' then 'cancelado'
         when b.pago >= b.total then 'pago'
         when b.vencimento is not null and b.vencimento < current_date then 'fiado_vencido'
         when b.vencimento is not null then 'fiado'
         when b.valor_sinal > 0 and b.pago < b.valor_sinal then 'sinal_pendente'
         when b.pago > 0 then 'parcial'
         else 'a_receber'
       end as situacao_pagamento
from base b
left join clientes cl on cl.id = b.cliente_id;

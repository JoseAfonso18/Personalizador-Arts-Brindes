-- 0013 — Anexos do pedido (arquivos privados no Storage) e "repetir pedido"

-- Pasta privada para logos, SVGs e arquivos do EzCad (até 25 MB por arquivo)
insert into storage.buckets (id, name, public, file_size_limit)
values ('anexos', 'anexos', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "anexos: logados leem" on storage.objects;
create policy "anexos: logados leem" on storage.objects for select to authenticated using (bucket_id = 'anexos');
drop policy if exists "anexos: logados enviam" on storage.objects;
create policy "anexos: logados enviam" on storage.objects for insert to authenticated with check (bucket_id = 'anexos');
drop policy if exists "anexos: logados apagam" on storage.objects;
create policy "anexos: logados apagam" on storage.objects for delete to authenticated using (bucket_id = 'anexos');

create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete set null, -- para listar na ficha do cliente
  nome text not null,
  caminho text not null, -- caminho no Storage (o mesmo arquivo pode estar em mais de um pedido, ao repetir)
  tipo text,
  tamanho bigint,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
create index if not exists anexos_pedido on public.anexos (pedido_id);
create index if not exists anexos_cliente on public.anexos (cliente_id);

create or replace function public.anexo_cliente()
returns trigger language plpgsql set search_path = public as $$
begin
  new.cliente_id := coalesce(new.cliente_id, (select cliente_id from pedidos where id = new.pedido_id));
  return new;
end $$;
drop trigger if exists anexo_cliente on public.anexos;
create trigger anexo_cliente before insert on public.anexos for each row execute function public.anexo_cliente();
drop trigger if exists auditoria on public.anexos;
create trigger auditoria before insert or update on public.anexos for each row execute function public.preencher_auditoria();

alter table public.anexos enable row level security;
drop policy if exists "logados: tudo" on public.anexos;
create policy "logados: tudo" on public.anexos for all to authenticated using (true) with check (true);

-- Repetir pedido: orçamento novo igual (itens, o que gravar, mockup) com preços atuais
alter table public.orcamentos add column if not exists repete_pedido_id uuid references public.pedidos (id) on delete set null;

create or replace function public.repetir_pedido(p_pedido uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_orc uuid;
  v_cliente uuid;
begin
  select cliente_id into v_cliente from pedidos where id = p_pedido;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_cliente is null then raise exception 'Venda sem cliente cadastrado não pode ser repetida'; end if;
  insert into orcamentos (cliente_id, observacao, repete_pedido_id)
  select cliente_id, observacao, id from pedidos where id = p_pedido
  returning id into v_orc;
  insert into orcamento_itens (orcamento_id, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup)
  select v_orc, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup
  from pedido_itens where pedido_id = p_pedido;
  update orcamento_itens i
     set preco_unitario = coalesce(preco_orcamento(v_orc, i.produto_id, i.variacao_id), i.preco_unitario)
   where i.orcamento_id = v_orc and i.produto_id is not null;
  return v_orc;
end $$;
revoke all on function public.repetir_pedido(uuid) from public, anon;
grant execute on function public.repetir_pedido(uuid) to authenticated;

-- Ao aprovar um orçamento que repete um pedido, o pedido novo já nasce com os mesmos arquivos
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
  insert into anexos (pedido_id, cliente_id, nome, caminho, tipo, tamanho, created_by)
  select v_pedido, a.cliente_id, a.nome, a.caminho, a.tipo, a.tamanho, a.created_by
  from anexos a join orcamentos o on o.repete_pedido_id = a.pedido_id
  where o.id = p_orcamento;
  return v_pedido;
end $$;
revoke all on function public.criar_pedido_de_orcamento(uuid) from public, anon, authenticated;

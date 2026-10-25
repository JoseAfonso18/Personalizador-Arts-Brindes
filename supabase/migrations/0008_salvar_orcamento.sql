-- 0008 — Salvar, renovar e duplicar orçamento (tudo ou nada)
-- security invoker: respeita as regras de acesso (só usuários logados)

-- Preço da faixa considerando a quantidade total daquele produto no orçamento (somando as cores)
create or replace function public.preco_orcamento(p_orcamento uuid, p_produto uuid, p_variacao uuid)
returns numeric language sql stable security invoker set search_path = public as $$
  select preco_unitario(
    p_produto,
    (select coalesce(sum(quantidade), 0)::int from orcamento_itens where orcamento_id = p_orcamento and produto_id = p_produto),
    p_variacao
  )
$$;

create or replace function public.salvar_orcamento(p jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if p ->> 'id' is null then
    insert into orcamentos (cliente_id, validade, prazo_entrega, desconto_tipo, desconto_valor, desconto_motivo,
                            frete_valor, frete_repassado, sinal_modo, sinal_percentual, observacao)
    values ((p ->> 'cliente_id')::uuid, nullif(p ->> 'validade', '')::date, nullif(p ->> 'prazo_entrega', '')::date,
            coalesce(p ->> 'desconto_tipo', 'valor'), coalesce((p ->> 'desconto_valor')::numeric, 0), nullif(trim(p ->> 'desconto_motivo'), ''),
            coalesce((p ->> 'frete_valor')::numeric, 0), coalesce((p ->> 'frete_repassado')::boolean, true),
            coalesce(p ->> 'sinal_modo', 'auto'), nullif(p ->> 'sinal_percentual', '')::numeric, nullif(trim(p ->> 'observacao'), ''))
    returning id into v_id;
  else
    v_id := (p ->> 'id')::uuid;
    if (select status from orcamentos where id = v_id) = 'aprovado' then
      raise exception 'Orçamento aprovado não pode ser alterado';
    end if;
    update orcamentos set
      cliente_id = (p ->> 'cliente_id')::uuid,
      validade = coalesce(nullif(p ->> 'validade', '')::date, validade),
      prazo_entrega = nullif(p ->> 'prazo_entrega', '')::date,
      desconto_tipo = coalesce(p ->> 'desconto_tipo', 'valor'),
      desconto_valor = coalesce((p ->> 'desconto_valor')::numeric, 0),
      desconto_motivo = nullif(trim(p ->> 'desconto_motivo'), ''),
      frete_valor = coalesce((p ->> 'frete_valor')::numeric, 0),
      frete_repassado = coalesce((p ->> 'frete_repassado')::boolean, true),
      sinal_modo = coalesce(p ->> 'sinal_modo', 'auto'),
      sinal_percentual = nullif(p ->> 'sinal_percentual', '')::numeric,
      observacao = nullif(trim(p ->> 'observacao'), '')
    where id = v_id;
    if not found then raise exception 'Orçamento não encontrado'; end if;
  end if;

  delete from orcamento_itens where orcamento_id = v_id;
  insert into orcamento_itens (orcamento_id, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup)
  select v_id, (ord - 1)::int, nullif(i ->> 'produto_id', '')::uuid, nullif(i ->> 'variacao_id', '')::uuid, trim(i ->> 'descricao'),
         nullif(trim(i ->> 'detalhe'), ''), (i ->> 'quantidade')::int, (i ->> 'preco_unitario')::numeric,
         coalesce((i ->> 'adicional')::numeric, 0), coalesce((i ->> 'item_do_cliente')::boolean, false), i -> 'mockup'
  from jsonb_array_elements(coalesce(p -> 'itens', '[]'::jsonb)) with ordinality as x(i, ord);

  if not exists (select 1 from orcamento_itens where orcamento_id = v_id) then
    raise exception 'O orçamento precisa de pelo menos um item';
  end if;
  return v_id;
end $$;

-- Atualiza preços pela tabela atual (itens de produtos cadastrados) e dá nova validade
create or replace function public.renovar_orcamento(p_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
begin
  if (select status from orcamentos where id = p_id) = 'aprovado' then
    raise exception 'Orçamento aprovado não pode ser renovado';
  end if;
  update orcamento_itens i
     set preco_unitario = coalesce(preco_orcamento(p_id, i.produto_id, i.variacao_id), i.preco_unitario)
   where i.orcamento_id = p_id and i.produto_id is not null;
  update orcamentos
     set validade = current_date + coalesce((select validade_dias from configuracoes where id), 7),
         status = case when status = 'recusado' then 'rascunho' else status end
   where id = p_id;
  return p_id;
end $$;

-- Cria um orçamento novo igual (mesmo cliente, itens e artes) com preços atuais
create or replace function public.duplicar_orcamento(p_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_novo uuid;
begin
  insert into orcamentos (cliente_id, prazo_entrega, desconto_tipo, desconto_valor, desconto_motivo, frete_valor, frete_repassado, sinal_modo, sinal_percentual, observacao)
  select cliente_id, null, desconto_tipo, desconto_valor, desconto_motivo, frete_valor, frete_repassado, sinal_modo, sinal_percentual, observacao
  from orcamentos where id = p_id
  returning id into v_novo;
  if v_novo is null then raise exception 'Orçamento não encontrado'; end if;
  insert into orcamento_itens (orcamento_id, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup)
  select v_novo, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup
  from orcamento_itens where orcamento_id = p_id;
  update orcamento_itens i
     set preco_unitario = coalesce(preco_orcamento(v_novo, i.produto_id, i.variacao_id), i.preco_unitario)
   where i.orcamento_id = v_novo and i.produto_id is not null;
  return v_novo;
end $$;

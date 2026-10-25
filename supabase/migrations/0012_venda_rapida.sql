-- 0012 — Venda rápida de balcão: cria o pedido (e o pagamento) numa operação só
-- p: { cliente_id?, itens: [{produto_id?, variacao_id?, descricao, detalhe?, quantidade, preco_unitario, item_do_cliente?}],
--      desconto?, desconto_motivo?, forma: pix|dinheiro|cartao|boleto|fiado, vencimento? (fiado), entregue: bool, observacao? }
create or replace function public.venda_rapida(p jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
  v_subtotal numeric;
  v_desconto numeric := coalesce((p ->> 'desconto')::numeric, 0);
  v_total numeric;
  v_forma text := p ->> 'forma';
  v_cliente uuid := nullif(p ->> 'cliente_id', '')::uuid;
begin
  if jsonb_array_length(coalesce(p -> 'itens', '[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos um item';
  end if;
  if v_desconto > 0 and length(trim(coalesce(p ->> 'desconto_motivo', ''))) = 0 then
    raise exception 'Informe o motivo do desconto';
  end if;
  if v_forma not in ('pix', 'dinheiro', 'cartao', 'boleto', 'fiado') then
    raise exception 'Forma de pagamento inválida';
  end if;
  if v_forma = 'fiado' then
    if v_cliente is null or not coalesce((select confianca from clientes where id = v_cliente), false) then
      raise exception 'Fiado só para cliente de confiança';
    end if;
    if nullif(p ->> 'vencimento', '') is null then
      raise exception 'Informe quando o cliente vai pagar';
    end if;
  end if;

  select coalesce(sum((i ->> 'quantidade')::int * (i ->> 'preco_unitario')::numeric), 0)
    into v_subtotal from jsonb_array_elements(p -> 'itens') i;
  v_desconto := least(v_desconto, v_subtotal);
  v_total := v_subtotal - v_desconto;

  insert into pedidos (origem, cliente_id, status, observacao, subtotal, desconto, total, valor_sinal, prazo_entrega)
  values ('venda_rapida', v_cliente, case when coalesce((p ->> 'entregue')::boolean, true) then 'entregue' else 'aprovado' end,
          nullif(trim(concat_ws(' · ', nullif(trim(p ->> 'observacao'), ''), case when v_desconto > 0 then 'Desconto: ' || trim(p ->> 'desconto_motivo') end)), ''),
          v_subtotal, v_desconto, v_total, 0, case when coalesce((p ->> 'entregue')::boolean, true) then current_date end)
  returning id into v_id;

  insert into pedido_itens (pedido_id, ordem, produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, item_do_cliente)
  select v_id, (ord - 1)::int, nullif(i ->> 'produto_id', '')::uuid, nullif(i ->> 'variacao_id', '')::uuid, trim(i ->> 'descricao'),
         nullif(trim(i ->> 'detalhe'), ''), (i ->> 'quantidade')::int, (i ->> 'preco_unitario')::numeric, coalesce((i ->> 'item_do_cliente')::boolean, false)
  from jsonb_array_elements(p -> 'itens') with ordinality as x(i, ord);

  if v_forma = 'fiado' then
    update pedidos set vencimento = (p ->> 'vencimento')::date where id = v_id;
  elsif v_total > 0 then
    insert into pagamentos (pedido_id, valor, forma) values (v_id, v_total, v_forma);
  end if;
  return v_id;
end $$;
revoke all on function public.venda_rapida(jsonb) from public, anon;
grant execute on function public.venda_rapida(jsonb) to authenticated;

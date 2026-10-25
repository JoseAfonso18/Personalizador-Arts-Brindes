-- 0004 — salvar_produto: grava produto + faixas + cores numa operação só.
-- Se qualquer parte falhar (ex.: faixas sobrepostas), nada é salvo.
-- security invoker: respeita as regras de acesso (só usuários logados).
create or replace function public.salvar_produto(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_tipo text := coalesce(p ->> 'tipo', 'produto');
  v_variacoes jsonb := coalesce(p -> 'variacoes', '[]'::jsonb);
begin
  if p ->> 'id' is null then
    insert into produtos (nome, tipo, ativo, observacao)
    values (trim(p ->> 'nome'), v_tipo, coalesce((p ->> 'ativo')::boolean, true), nullif(trim(p ->> 'observacao'), ''))
    returning id into v_id;
  else
    v_id := (p ->> 'id')::uuid;
    if v_tipo <> 'produto' then
      delete from variacoes where produto_id = v_id;
    end if;
    update produtos
       set nome = trim(p ->> 'nome'),
           tipo = v_tipo,
           ativo = coalesce((p ->> 'ativo')::boolean, true),
           observacao = nullif(trim(p ->> 'observacao'), '')
     where id = v_id;
    if not found then
      raise exception 'Produto não encontrado';
    end if;
  end if;

  -- Faixas: substitui todas
  delete from faixas_preco where produto_id = v_id;
  insert into faixas_preco (produto_id, qtd_min, qtd_max, preco)
  select v_id, (f ->> 'qtd_min')::int, nullif(f ->> 'qtd_max', '')::int, (f ->> 'preco')::numeric
  from jsonb_array_elements(coalesce(p -> 'faixas', '[]'::jsonb)) f;

  -- Cores: mantém as existentes (por id), remove as que saíram, cria as novas
  if v_tipo = 'produto' then
    delete from variacoes
     where produto_id = v_id
       and id not in (select (v ->> 'id')::uuid from jsonb_array_elements(v_variacoes) v where v ->> 'id' is not null);

    update variacoes t
       set nome = trim(v ->> 'nome'),
           acrescimo = coalesce((v ->> 'acrescimo')::numeric, 0),
           estoque = coalesce((v ->> 'estoque')::int, 0),
           estoque_minimo = coalesce((v ->> 'estoque_minimo')::int, 0),
           ativo = coalesce((v ->> 'ativo')::boolean, true)
      from jsonb_array_elements(v_variacoes) v
     where v ->> 'id' is not null and t.id = (v ->> 'id')::uuid and t.produto_id = v_id;

    insert into variacoes (produto_id, nome, acrescimo, estoque, estoque_minimo, ativo)
    select v_id, trim(v ->> 'nome'), coalesce((v ->> 'acrescimo')::numeric, 0), coalesce((v ->> 'estoque')::int, 0),
           coalesce((v ->> 'estoque_minimo')::int, 0), coalesce((v ->> 'ativo')::boolean, true)
    from jsonb_array_elements(v_variacoes) v
    where v ->> 'id' is null;
  end if;

  return v_id;
end $$;

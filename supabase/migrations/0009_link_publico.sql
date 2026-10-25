-- 0009 — Link público do orçamento (/o/<token>)
-- Quem tem o link vê aquele orçamento e pode aprovar. Ninguém de fora lista ou lê as tabelas:
-- as funções abaixo rodam como dono (security definer) e só devolvem o orçamento do token.

alter table public.orcamentos add column if not exists visualizado_em timestamptz;

create or replace function public.orcamento_publico(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'numero', o.numero,
    'status', o.status,
    'situacao', case when o.status in ('rascunho', 'enviado') and o.validade < current_date then 'expirado' else o.status end,
    'validade', o.validade,
    'prazo_entrega', o.prazo_entrega,
    'observacao', o.observacao,
    'aprovado_em', o.aprovado_em,
    'aprovado_por', o.aprovado_por,
    'frete_repassado', o.frete_repassado,
    'cliente', coalesce(nullif(cl.nome_fantasia, ''), cl.nome),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descricao', i.descricao, 'detalhe', i.detalhe, 'quantidade', i.quantidade,
        'preco_unitario', i.preco_unitario, 'adicional', i.adicional,
        'item_do_cliente', i.item_do_cliente, 'mockup', i.mockup
      ) order by i.ordem)
      from orcamento_itens i where i.orcamento_id = o.id), '[]'::jsonb),
    'totais', (select to_jsonb(t) from orcamento_totais(o.id) t),
    'loja', (select jsonb_build_object(
      'nome', c.loja_nome, 'cnpj', c.loja_cnpj, 'whatsapp', c.loja_whatsapp, 'telefone', c.loja_telefone,
      'email', c.loja_email, 'instagram', c.loja_instagram, 'endereco', c.loja_endereco, 'cidade', c.loja_cidade,
      'formas_pagamento', c.formas_pagamento, 'texto_com_sinal', c.texto_com_sinal, 'texto_sem_sinal', c.texto_sem_sinal,
      'validade_dias', c.validade_dias
    ) from configuracoes c where c.id)
  )
  from orcamentos o
  join clientes cl on cl.id = o.cliente_id
  where length(p_token) >= 32 and o.token = p_token
$$;

-- Marca quando o cliente abriu o link pela primeira vez
create or replace function public.registrar_visualizacao(p_token text)
returns void language sql volatile security definer set search_path = public as $$
  update orcamentos set visualizado_em = now()
  where length(p_token) >= 32 and token = p_token and visualizado_em is null
$$;

-- Cliente aprova pelo link (só se estiver em aberto e dentro da validade)
create or replace function public.aprovar_orcamento_publico(p_token text, p_nome text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  o orcamentos%rowtype;
begin
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Informe seu nome para aprovar';
  end if;
  select * into o from orcamentos where length(p_token) >= 32 and token = p_token for update;
  if not found then raise exception 'Orçamento não encontrado'; end if;
  if o.status = 'aprovado' then raise exception 'Este orçamento já foi aprovado'; end if;
  if o.status = 'recusado' then raise exception 'Este orçamento não está mais disponível'; end if;
  if o.validade < current_date then raise exception 'Este orçamento venceu. Peça um novo para a loja'; end if;
  update orcamentos
     set status = 'aprovado', aprovado_em = now(), aprovado_por = left(trim(p_nome), 80) || ' (pelo link)'
   where id = o.id;
  return orcamento_publico(p_token);
end $$;

revoke all on function public.orcamento_publico(text) from public;
revoke all on function public.registrar_visualizacao(text) from public;
revoke all on function public.aprovar_orcamento_publico(text, text) from public;
grant execute on function public.orcamento_publico(text) to anon, authenticated;
grant execute on function public.registrar_visualizacao(text) to anon, authenticated;
grant execute on function public.aprovar_orcamento_publico(text, text) to anon, authenticated;

-- A lista ganha "visualizado_em" (cliente abriu o link)
drop view if exists public.orcamentos_lista;
create view public.orcamentos_lista with (security_invoker = true) as
select o.id, o.numero, o.status, o.validade, o.prazo_entrega, o.created_at, o.updated_at, o.cliente_id,
       o.visualizado_em, o.aprovado_em, o.aprovado_por,
       coalesce(nullif(cl.nome_fantasia, ''), cl.nome) as cliente_nome,
       t.total, t.quantidade, t.pede_sinal, t.valor_sinal,
       case when o.status in ('rascunho', 'enviado') and o.validade < current_date then 'expirado' else o.status end as situacao
from orcamentos o
join clientes cl on cl.id = o.cliente_id
cross join lateral orcamento_totais(o.id) t;

import { supabase } from '@/lib/supabase'

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado'
export type Situacao = StatusOrcamento | 'expirado'

export type ItemOrcamento = {
  produto_id: string | null
  variacao_id: string | null
  descricao: string
  detalhe: string | null
  quantidade: number
  preco_unitario: number
  adicional: number
  item_do_cliente: boolean
  mockup: unknown | null
}

export type Orcamento = {
  id?: string
  numero?: number
  status?: StatusOrcamento
  token?: string
  cliente_id: string
  validade: string | null
  prazo_entrega: string | null
  desconto_tipo: 'valor' | 'percentual'
  desconto_valor: number
  desconto_motivo: string | null
  frete_valor: number
  frete_repassado: boolean
  sinal_modo: 'auto' | 'forcar' | 'sem'
  sinal_percentual: number | null
  observacao: string | null
  aprovado_em?: string | null
  aprovado_por?: string | null
  itens: ItemOrcamento[]
}

export type LinhaLista = {
  id: string
  numero: number
  status: StatusOrcamento
  situacao: Situacao
  validade: string
  prazo_entrega: string | null
  created_at: string
  cliente_id: string
  cliente_nome: string
  total: number
  quantidade: number
  pede_sinal: boolean
  valor_sinal: number
}

const num = (v: unknown) => (v == null ? null : Number(v))

function erro(msg: string) {
  if (msg.includes('desconto_com_motivo')) return 'Informe o motivo do desconto.'
  if (msg.includes('pelo menos um item')) return 'Adicione pelo menos um item.'
  if (msg.includes('aprovado não pode')) return 'Orçamento aprovado não pode ser alterado. Duplique para fazer outro.'
  if (msg.includes('Failed to fetch')) return 'Sem conexão com o banco. Verifique a internet.'
  return msg
}

export async function listarOrcamentos(): Promise<LinhaLista[]> {
  const { data, error } = await supabase.from('orcamentos_lista').select('*').order('numero', { ascending: false })
  if (error) throw new Error(erro(error.message))
  return (data as Record<string, unknown>[]).map((l) => ({ ...(l as unknown as LinhaLista), total: Number(l.total), valor_sinal: Number(l.valor_sinal) }))
}

export async function buscarOrcamento(id: string): Promise<Orcamento | null> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select(
      'id, numero, status, token, cliente_id, validade, prazo_entrega, desconto_tipo, desconto_valor, desconto_motivo, frete_valor, frete_repassado, sinal_modo, sinal_percentual, observacao, aprovado_em, aprovado_por, itens:orcamento_itens(produto_id, variacao_id, descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, mockup, ordem)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(erro(error.message))
  if (!data) return null
  const d = data as Record<string, unknown> & { itens: (Record<string, unknown> & { ordem: number })[] }
  return {
    ...(d as unknown as Orcamento),
    desconto_valor: Number(d.desconto_valor),
    frete_valor: Number(d.frete_valor),
    sinal_percentual: num(d.sinal_percentual),
    itens: d.itens
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => ({ ...(i as unknown as ItemOrcamento), preco_unitario: Number(i.preco_unitario), adicional: Number(i.adicional) })),
  }
}

export async function salvarOrcamento(o: Orcamento): Promise<string> {
  const { data, error } = await supabase.rpc('salvar_orcamento', { p: o })
  if (error) throw new Error(erro(error.message))
  return data as string
}

export async function renovarOrcamento(id: string) {
  const { error } = await supabase.rpc('renovar_orcamento', { p_id: id })
  if (error) throw new Error(erro(error.message))
}

export async function duplicarOrcamento(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('duplicar_orcamento', { p_id: id })
  if (error) throw new Error(erro(error.message))
  return data as string
}

export async function mudarStatus(id: string, status: StatusOrcamento, quem?: string) {
  const extra =
    status === 'aprovado' ? { aprovado_em: new Date().toISOString(), aprovado_por: quem ?? null } : status === 'enviado' ? { enviado_em: new Date().toISOString() } : {}
  const { error } = await supabase.from('orcamentos').update({ status, ...extra }).eq('id', id)
  if (error) throw new Error(erro(error.message))
}

export async function excluirOrcamento(id: string) {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id)
  if (error) throw new Error(erro(error.message))
}

export const SITUACOES: Record<Situacao, { texto: string; classe: string }> = {
  rascunho: { texto: 'Rascunho', classe: 'bg-muted text-muted-foreground' },
  enviado: { texto: 'Aguardando cliente', classe: 'bg-primary-soft text-primary-strong' },
  aprovado: { texto: 'Aprovado', classe: 'bg-success-soft text-success' },
  recusado: { texto: 'Recusado', classe: 'bg-destructive-soft text-destructive' },
  expirado: { texto: 'Vencido', classe: 'bg-warning-soft text-warning' },
}

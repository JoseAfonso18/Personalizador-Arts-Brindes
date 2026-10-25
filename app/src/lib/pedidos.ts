import { supabase } from '@/lib/supabase'

export type StatusPedido = 'aprovado' | 'gravando' | 'pronto' | 'entregue' | 'cancelado'

export const ETAPAS: { status: Exclude<StatusPedido, 'cancelado'>; titulo: string; classe: string; ponto: string }[] = [
  { status: 'aprovado', titulo: 'Aprovado', classe: 'bg-muted text-foreground', ponto: 'bg-foreground/50' },
  { status: 'gravando', titulo: 'Gravando', classe: 'bg-primary-soft text-primary-strong', ponto: 'bg-primary' },
  { status: 'pronto', titulo: 'Pronto', classe: 'bg-warning-soft text-warning', ponto: 'bg-warning' },
  { status: 'entregue', titulo: 'Entregue', classe: 'bg-success-soft text-success', ponto: 'bg-success' },
]
export const TITULO_STATUS: Record<StatusPedido, string> = { aprovado: 'Aprovado', gravando: 'Gravando', pronto: 'Pronto', entregue: 'Entregue', cancelado: 'Cancelado' }

export function proximaEtapa(s: StatusPedido): StatusPedido | null {
  const i = ETAPAS.findIndex((e) => e.status === s)
  return i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1].status : null
}

export type LinhaPedido = {
  id: string
  numero: number
  origem: 'orcamento' | 'venda_rapida'
  status: StatusPedido
  prazo_entrega: string | null
  total: number
  valor_sinal: number
  created_at: string
  entregue_em: string | null
  orcamento_id: string | null
  cliente_id: string | null
  cliente_nome: string
  quantidade: number
  resumo: string | null
  atrasado: boolean
}

export type Pedido = {
  id: string
  numero: number
  origem: 'orcamento' | 'venda_rapida'
  status: StatusPedido
  orcamento_id: string | null
  cliente_id: string | null
  prazo_entrega: string | null
  nota_venda: string | null
  observacao: string | null
  subtotal: number
  desconto: number
  frete: number
  frete_repassado: boolean
  total: number
  sinal_percentual: number | null
  valor_sinal: number
  entregue_em: string | null
  created_at: string
  orcamento: { numero: number } | null
  cliente: { id: string; tipo: 'pf' | 'pj'; nome: string; nome_fantasia: string | null; celular: string | null; telefone: string | null; cidade: string | null; uf: string | null } | null
  itens: { descricao: string; detalhe: string | null; quantidade: number; preco_unitario: number; adicional: number; item_do_cliente: boolean; ordem: number }[]
  historico: { id: number; de: string | null; para: StatusPedido; em: string; por: string | null; por_nome: string | null }[]
}

const msg = (m: string) => (m.includes('Failed to fetch') ? 'Sem conexão com o banco. Verifique a internet.' : m)

export async function listarPedidos(): Promise<LinhaPedido[]> {
  const { data, error } = await supabase.from('pedidos_lista').select('*').order('numero', { ascending: false })
  if (error) throw new Error(msg(error.message))
  return (data as Record<string, unknown>[]).map((p) => ({ ...(p as unknown as LinhaPedido), total: Number(p.total), valor_sinal: Number(p.valor_sinal) }))
}

export async function buscarPedido(id: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      '*, orcamento:orcamentos(numero), cliente:clientes(id, tipo, nome, nome_fantasia, celular, telefone, cidade, uf), itens:pedido_itens(descricao, detalhe, quantidade, preco_unitario, adicional, item_do_cliente, ordem), historico:pedido_historico(id, de, para, em, por, por_nome)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(msg(error.message))
  if (!data) return null
  const d = data as Record<string, unknown> & Pedido
  const n = (k: keyof Pedido) => Number(d[k])
  return {
    ...d,
    subtotal: n('subtotal'),
    desconto: n('desconto'),
    frete: n('frete'),
    total: n('total'),
    valor_sinal: n('valor_sinal'),
    sinal_percentual: d.sinal_percentual == null ? null : Number(d.sinal_percentual),
    itens: d.itens.map((i) => ({ ...i, preco_unitario: Number(i.preco_unitario), adicional: Number(i.adicional) })).sort((a, b) => a.ordem - b.ordem),
    historico: [...d.historico].sort((a, b) => a.id - b.id),
  }
}

export async function mudarStatusPedido(id: string, status: StatusPedido) {
  const { error } = await supabase.from('pedidos').update({ status }).eq('id', id)
  if (error) throw new Error(msg(error.message))
}

export async function atualizarPedido(id: string, campos: Partial<Pick<Pedido, 'prazo_entrega' | 'nota_venda' | 'observacao'>>) {
  const { error } = await supabase.from('pedidos').update(campos).eq('id', id)
  if (error) throw new Error(msg(error.message))
}

export async function pedidoDoOrcamento(orcamentoId: string): Promise<{ id: string; numero: number } | null> {
  const { data } = await supabase.from('pedidos').select('id, numero').eq('orcamento_id', orcamentoId).maybeSingle()
  return (data as { id: string; numero: number } | null) ?? null
}

/** "Hoje", "Amanhã", "Atrasado 3 dias", "em 5 dias" */
export function descreverPrazo(prazo: string | null, hojeIso: string): { texto: string; tom: 'atrasado' | 'hoje' | 'perto' | 'normal' } | null {
  if (!prazo) return null
  const dias = Math.round((new Date(prazo).getTime() - new Date(hojeIso).getTime()) / 86400000)
  if (dias < 0) return { texto: `Atrasado ${-dias} ${dias === -1 ? 'dia' : 'dias'}`, tom: 'atrasado' }
  if (dias === 0) return { texto: 'Entrega hoje', tom: 'hoje' }
  if (dias === 1) return { texto: 'Entrega amanhã', tom: 'perto' }
  if (dias <= 3) return { texto: `Entrega em ${dias} dias`, tom: 'perto' }
  const [a, m, d] = prazo.split('-')
  void a
  return { texto: `Entrega ${d}/${m}`, tom: 'normal' }
}

// Mockup 3D do item: guardado em orcamento_itens.mockup / pedido_itens.mockup (jsonb).
// O desenho fica todo no `hash` (#p=...), o mesmo formato do link do Personalizador.

export type Mockup = {
  hash: string
  titulo: string
  desc: string
  produto?: string
  cor?: string
}

export const CAMINHO_PROVADOR = '/provador3d/index.html'

export function lerMockup(m: unknown): Mockup | null {
  if (!m || typeof m !== 'object') return null
  const o = m as Record<string, unknown>
  if (typeof o.hash !== 'string' || !o.hash.startsWith('#p=')) return null
  return {
    hash: o.hash,
    titulo: typeof o.titulo === 'string' ? o.titulo : 'Mockup 3D',
    desc: typeof o.desc === 'string' ? o.desc : '',
    produto: typeof o.produto === 'string' ? o.produto : undefined,
    cor: typeof o.cor === 'string' ? o.cor : undefined,
  }
}

/** Qual modelo 3D usar para um produto do cadastro (pelo nome). */
export function modeloDoProduto(nome: string | null | undefined): string {
  const n = (nome ?? '').toLowerCase()
  if (n.includes('caneca')) return 'caneca'
  if (n.includes('garrafa') || n.includes('squeeze')) return /500|slim/.test(n) ? 'slim' : 'garrafa'
  return 'copo'
}

/** Primeira linha curta do "o que gravar" vira o texto inicial do provador. */
export function textoInicial(detalhe: string | null | undefined): string | undefined {
  const linha = (detalhe ?? '').split('\n')[0].trim()
  return linha && linha.length <= 40 ? linha : undefined
}

export function urlProvador(
  modo: 'editar' | 'ver',
  op: {
    produto?: string
    cor?: string
    texto?: string
    mockup?: Mockup | null
  } = {},
): string {
  const qs = new URLSearchParams({ embed: '1', modo })
  if (!op.mockup) {
    if (op.produto) qs.set('produto', op.produto)
    if (op.cor) qs.set('cor', op.cor)
    if (op.texto) qs.set('texto', op.texto)
  }
  return `${CAMINHO_PROVADOR}?${qs.toString()}${op.mockup?.hash ?? ''}`
}

/** Mensagem que o provador manda ao salvar; null se não for dele. */
export function lerMensagemProvador(dados: unknown): Mockup | 'cancelar' | null {
  if (!dados || typeof dados !== 'object') return null
  const d = dados as Record<string, unknown>
  if (d.tipo === 'arts-mockup-cancelar') return 'cancelar'
  if (d.tipo !== 'arts-mockup') return null
  return lerMockup(d)
}

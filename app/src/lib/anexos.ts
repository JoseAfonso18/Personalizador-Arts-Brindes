import { supabase } from '@/lib/supabase'

export type Anexo = { id: string; pedido_id: string; nome: string; caminho: string; tipo: string | null; tamanho: number | null; created_at: string; pedido?: { numero: number } | null }

const BUCKET = 'anexos'
const LIMITE = 25 * 1024 * 1024

export async function listarAnexosPedido(pedidoId: string): Promise<Anexo[]> {
  const { data, error } = await supabase.from('anexos').select('id, pedido_id, nome, caminho, tipo, tamanho, created_at').eq('pedido_id', pedidoId).order('created_at')
  if (error) throw new Error(error.message)
  return data as Anexo[]
}

export async function listarAnexosCliente(clienteId: string): Promise<Anexo[]> {
  const { data, error } = await supabase
    .from('anexos')
    .select('id, pedido_id, nome, caminho, tipo, tamanho, created_at, pedido:pedidos(numero)')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  // o mesmo arquivo pode estar em vários pedidos (repetidos): mostra uma vez
  const vistos = new Set<string>()
  return (data as unknown as Anexo[]).filter((a) => (vistos.has(a.caminho) ? false : (vistos.add(a.caminho), true)))
}

/** Nome seguro para o Storage (sem acentos/espaços), mantendo a extensão. */
export function nomeSeguro(nome: string) {
  const limpo = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_')
  return limpo.slice(-80) || 'arquivo'
}

export async function enviarAnexo(pedidoId: string, arquivo: File) {
  if (arquivo.size > LIMITE) throw new Error(`"${arquivo.name}" passa de 25 MB.`)
  const caminho = `pedidos/${pedidoId}/${crypto.randomUUID().slice(0, 8)}-${nomeSeguro(arquivo.name)}`
  const up = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type || 'application/octet-stream' })
  if (up.error) throw new Error(`Não foi possível enviar "${arquivo.name}": ${up.error.message}`)
  const { error } = await supabase.from('anexos').insert({ pedido_id: pedidoId, nome: arquivo.name, caminho, tipo: arquivo.type || null, tamanho: arquivo.size })
  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho])
    throw new Error(error.message)
  }
}

/** Remove do pedido; o arquivo só é apagado do Storage se nenhum outro pedido usar. */
export async function removerAnexo(a: Anexo) {
  const { error } = await supabase.from('anexos').delete().eq('id', a.id)
  if (error) throw new Error(error.message)
  const { count } = await supabase.from('anexos').select('id', { count: 'exact', head: true }).eq('caminho', a.caminho)
  if (!count) await supabase.storage.from(BUCKET).remove([a.caminho])
}

export async function linkAnexo(a: Pick<Anexo, 'caminho' | 'nome'>, baixar = false): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.caminho, 3600, baixar ? { download: a.nome } : undefined)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export const ehImagem = (a: Pick<Anexo, 'tipo' | 'nome'>) => (a.tipo ?? '').startsWith('image/') || /\.(png|jpe?g|svg|webp|gif)$/i.test(a.nome)

export function tamanhoLegivel(b: number | null) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export async function repetirPedido(pedidoId: string): Promise<string> {
  const { data, error } = await supabase.rpc('repetir_pedido', { p_pedido: pedidoId })
  if (error) throw new Error(error.message)
  return data as string
}

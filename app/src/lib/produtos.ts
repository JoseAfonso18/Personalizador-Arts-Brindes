import { supabase } from '@/lib/supabase'
import type { Faixa } from '@/lib/preco'

export type TipoProduto = 'produto' | 'servico_gravacao'

export type Variacao = {
  id?: string
  nome: string
  acrescimo: number
  estoque: number
  estoque_minimo: number
  ativo: boolean
}

export type Produto = {
  id?: string
  nome: string
  tipo: TipoProduto
  ativo: boolean
  observacao: string | null
  faixas: Faixa[]
  variacoes: Variacao[]
}

const CAMPOS = 'id, nome, tipo, ativo, observacao, faixas:faixas_preco(qtd_min, qtd_max, preco), variacoes(id, nome, acrescimo, estoque, estoque_minimo, ativo)'

type Linha = Omit<Produto, 'faixas' | 'variacoes'> & {
  faixas: { qtd_min: number; qtd_max: number | null; preco: number | string }[]
  variacoes: (Omit<Variacao, 'acrescimo'> & { acrescimo: number | string })[]
}

// O Postgres devolve numeric como texto; aqui viram números e ficam ordenados
function normalizar(l: Linha): Produto {
  return {
    ...l,
    faixas: l.faixas.map((f) => ({ ...f, preco: Number(f.preco) })).sort((a, b) => a.qtd_min - b.qtd_min),
    variacoes: l.variacoes.map((v) => ({ ...v, acrescimo: Number(v.acrescimo) })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }
}

export async function listarProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase.from('produtos').select(CAMPOS).order('nome')
  if (error) throw new Error(traduzirErro(error.message))
  return (data as unknown as Linha[]).map(normalizar)
}

export async function buscarProduto(id: string): Promise<Produto | null> {
  const { data, error } = await supabase.from('produtos').select(CAMPOS).eq('id', id).maybeSingle()
  if (error) throw new Error(traduzirErro(error.message))
  return data ? normalizar(data as unknown as Linha) : null
}

/** Salva tudo de uma vez (função salvar_produto no banco). Devolve o id. */
export async function salvarProduto(p: Produto): Promise<string> {
  const { data, error } = await supabase.rpc('salvar_produto', { p })
  if (error) throw new Error(traduzirErro(error.message))
  return data as string
}

export async function excluirProduto(id: string): Promise<void> {
  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) throw new Error(traduzirErro(error.message))
}

export function traduzirErro(msg: string): string {
  if (msg.includes('faixas_sem_sobreposicao')) return 'Há faixas de preço se sobrepondo.'
  if (msg.includes('variacoes_produto_id_nome_key')) return 'Há cores com o mesmo nome.'
  if (msg.includes('violates foreign key')) return 'Este produto já é usado em orçamentos ou pedidos. Desative em vez de excluir.'
  if (msg.includes('Failed to fetch')) return 'Sem conexão com o banco. Verifique a internet.'
  return msg
}

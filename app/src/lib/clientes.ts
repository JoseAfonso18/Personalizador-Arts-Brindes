import { supabase } from '@/lib/supabase'

export type TipoCliente = 'pf' | 'pj'

export type Cliente = {
  id?: string
  tipo: TipoCliente
  nome: string
  nome_fantasia: string | null
  cpf_cnpj: string | null
  celular: string | null
  telefone: string | null
  email: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  confianca: boolean
  observacao: string | null
  ativo: boolean
}

const CAMPOS = 'id, tipo, nome, nome_fantasia, cpf_cnpj, celular, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, confianca, observacao, ativo'

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select(CAMPOS).order('nome')
  if (error) throw new Error(traduzirErro(error.message))
  return data as Cliente[]
}

export async function buscarCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase.from('clientes').select(CAMPOS).eq('id', id).maybeSingle()
  if (error) throw new Error(traduzirErro(error.message))
  return data as Cliente | null
}

export async function salvarCliente(c: Cliente): Promise<string> {
  const { id, ...dados } = c
  const q = id ? supabase.from('clientes').update(dados).eq('id', id).select('id').single() : supabase.from('clientes').insert(dados).select('id').single()
  const { data, error } = await q
  if (error) throw new Error(traduzirErro(error.message))
  return (data as { id: string }).id
}

export async function excluirCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw new Error(traduzirErro(error.message))
}

function traduzirErro(msg: string) {
  if (msg.includes('clientes_cpf_cnpj_unico')) return 'Já existe um cliente com esse CPF/CNPJ.'
  if (msg.includes('clientes_documento_formato')) return 'CPF/CNPJ em formato inválido.'
  if (msg.includes('violates foreign key')) return 'Este cliente já tem orçamentos ou pedidos. Desative em vez de excluir.'
  if (msg.includes('Failed to fetch')) return 'Sem conexão com o banco. Verifique a internet.'
  return msg
}

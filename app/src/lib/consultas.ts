import { formatarTelefone, limparCnpj, soDigitos } from '@/lib/documento'

/** Dados que preenchem o formulário de cliente a partir das consultas públicas. */
export type DadosEmpresa = {
  nome: string
  nome_fantasia: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  telefone: string
  email: string
}
export type DadosEndereco = Pick<DadosEmpresa, 'logradouro' | 'bairro' | 'cidade' | 'uf'>

type RespostaBrasilApi = {
  razao_social?: string
  nome_fantasia?: string | null
  cep?: string | number
  descricao_tipo_de_logradouro?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  ddd_telefone_1?: string
  email?: string | null
}

const titulo = (s = '') => s.toLowerCase().replace(/(^|\s|-|\/)(\p{L})/gu, (m) => m.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase())

export function mapearBrasilApi(r: RespostaBrasilApi): DadosEmpresa {
  const tipoLog = r.descricao_tipo_de_logradouro ? `${titulo(r.descricao_tipo_de_logradouro)} ` : ''
  return {
    nome: (r.razao_social ?? '').trim(),
    nome_fantasia: titulo((r.nome_fantasia ?? '').trim()),
    cep: soDigitos(String(r.cep ?? '')).padStart(8, '0').replace(/^0{8}$/, ''),
    logradouro: r.logradouro ? tipoLog + titulo(r.logradouro) : '',
    numero: (r.numero ?? '').trim(),
    complemento: titulo((r.complemento ?? '').trim()),
    bairro: titulo(r.bairro ?? ''),
    cidade: titulo(r.municipio ?? ''),
    uf: (r.uf ?? '').toUpperCase(),
    telefone: r.ddd_telefone_1 ? formatarTelefone(r.ddd_telefone_1) : '',
    email: (r.email ?? '').toLowerCase(),
  }
}

/** Consulta o CNPJ na BrasilAPI (gratuita). Só funciona para CNPJ numérico por enquanto. */
export async function buscarCnpj(cnpj: string): Promise<DadosEmpresa> {
  const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limparCnpj(cnpj)}`)
  if (r.status === 404) throw new Error('CNPJ não encontrado na Receita.')
  if (!r.ok) throw new Error('Não foi possível consultar o CNPJ agora. Preencha à mão ou tente de novo.')
  return mapearBrasilApi(await r.json())
}

/** Consulta o CEP no ViaCEP (gratuito). */
export async function buscarCep(cep: string): Promise<DadosEndereco> {
  const r = await fetch(`https://viacep.com.br/ws/${soDigitos(cep)}/json/`)
  if (!r.ok) throw new Error('Não foi possível consultar o CEP agora.')
  const j = await r.json()
  if (j.erro) throw new Error('CEP não encontrado.')
  return { logradouro: j.logradouro ?? '', bairro: j.bairro ?? '', cidade: j.localidade ?? '', uf: (j.uf ?? '').toUpperCase() }
}

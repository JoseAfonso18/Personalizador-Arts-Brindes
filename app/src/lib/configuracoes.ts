import { supabase } from '@/lib/supabase'

export type Configuracoes = {
  sinal_percentual: number
  sinal_valor_minimo: number | null
  sinal_qtd_minima: number | null
  validade_dias: number
  formas_pagamento: string
  texto_com_sinal: string
  texto_sem_sinal: string
  loja_nome: string
  loja_cnpj: string | null
  loja_whatsapp: string | null
  loja_telefone: string | null
  loja_email: string | null
  loja_instagram: string | null
  loja_endereco: string | null
  loja_cidade: string | null
}

const CAMPOS =
  'sinal_percentual, sinal_valor_minimo, sinal_qtd_minima, validade_dias, formas_pagamento, texto_com_sinal, texto_sem_sinal, loja_nome, loja_cnpj, loja_whatsapp, loja_telefone, loja_email, loja_instagram, loja_endereco, loja_cidade'

export async function lerConfiguracoes(): Promise<Configuracoes> {
  const { data, error } = await supabase.from('configuracoes').select(CAMPOS).eq('id', true).single()
  if (error) throw new Error(error.message.includes('Failed to fetch') ? 'Sem conexão com o banco.' : error.message)
  const d = data as Record<string, unknown>
  return {
    ...(d as unknown as Configuracoes),
    sinal_percentual: Number(d.sinal_percentual),
    sinal_valor_minimo: d.sinal_valor_minimo == null ? null : Number(d.sinal_valor_minimo),
  }
}

export async function salvarConfiguracoes(c: Configuracoes): Promise<void> {
  const { error } = await supabase.from('configuracoes').update(c).eq('id', true)
  if (error) throw new Error(error.message)
}

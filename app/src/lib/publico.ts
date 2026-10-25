import { supabase } from '@/lib/supabase'
import type { Situacao } from '@/lib/orcamentos'

export type OrcamentoPublico = {
  numero: number
  status: string
  situacao: Situacao
  validade: string
  prazo_entrega: string | null
  observacao: string | null
  aprovado_em: string | null
  aprovado_por: string | null
  frete_repassado: boolean
  cliente: string
  itens: { descricao: string; detalhe: string | null; quantidade: number; preco_unitario: number; adicional: number; item_do_cliente: boolean; mockup: unknown }[]
  totais: { subtotal: number; desconto: number; frete: number; total: number; quantidade: number; pede_sinal: boolean; sinal_percentual: number; valor_sinal: number; valor_restante: number }
  loja: {
    nome: string
    cnpj: string | null
    whatsapp: string | null
    telefone: string | null
    email: string | null
    instagram: string | null
    endereco: string | null
    cidade: string | null
    formas_pagamento: string
    texto_com_sinal: string
    texto_sem_sinal: string
    validade_dias: number
  } | null
}

function normalizar(o: OrcamentoPublico): OrcamentoPublico {
  const n = (x: unknown) => Number(x)
  return {
    ...o,
    itens: o.itens.map((i) => ({ ...i, preco_unitario: n(i.preco_unitario), adicional: n(i.adicional) })),
    totais: Object.fromEntries(Object.entries(o.totais).map(([k, v]) => [k, typeof v === 'boolean' ? v : n(v)])) as OrcamentoPublico['totais'],
  }
}

export async function carregarPublico(token: string): Promise<OrcamentoPublico | null> {
  const { data, error } = await supabase.rpc('orcamento_publico', { p_token: token })
  if (error) throw new Error(error.message.includes('Failed to fetch') ? 'Sem conexão. Verifique a internet e tente de novo.' : error.message)
  return data ? normalizar(data as OrcamentoPublico) : null
}

export async function registrarVisualizacao(token: string) {
  await supabase.rpc('registrar_visualizacao', { p_token: token })
}

export async function aprovarPublico(token: string, nome: string): Promise<OrcamentoPublico> {
  const { data, error } = await supabase.rpc('aprovar_orcamento_publico', { p_token: token, p_nome: nome })
  if (error) throw new Error(error.message)
  return normalizar(data as OrcamentoPublico)
}

/** Link do WhatsApp (wa.me) para um número brasileiro com DDD. */
export function linkWhatsApp(telefone: string | null | undefined, texto: string): string {
  const d = (telefone ?? '').replace(/\D/g, '')
  const numero = d ? (d.length <= 11 ? `55${d}` : d) : ''
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

export const linkOrcamento = (token: string) => `${window.location.origin}/o/${token}`

import { dividirSinal, precisaSinal, type RegraSinal } from '@/lib/condicoes'

/** Mesma conta da função orcamento_totais do banco, para mostrar ao vivo na tela. */
export type ItemCalculo = { quantidade: number; preco_unitario: number; adicional: number }
export type DadosCalculo = {
  itens: ItemCalculo[]
  desconto_tipo: 'valor' | 'percentual'
  desconto_valor: number
  frete_valor: number
  frete_repassado: boolean
  sinal_modo: 'auto' | 'forcar' | 'sem'
  sinal_percentual: number | null
}

export type Totais = {
  subtotal: number
  desconto: number
  frete: number
  total: number
  quantidade: number
  pede_sinal: boolean
  sinal_percentual: number
  valor_sinal: number
  valor_restante: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function calcularTotais(d: DadosCalculo, regra: RegraSinal): Totais {
  const subtotal = r2(d.itens.reduce((s, i) => s + i.quantidade * (i.preco_unitario + i.adicional), 0))
  const quantidade = d.itens.reduce((s, i) => s + i.quantidade, 0)
  const descontoBruto = d.desconto_tipo === 'percentual' ? r2((subtotal * d.desconto_valor) / 100) : d.desconto_valor
  const desconto = Math.min(subtotal, descontoBruto)
  const total = r2(subtotal - desconto + (d.frete_repassado ? d.frete_valor : 0))
  const pct = d.sinal_percentual ?? regra.sinal_percentual
  const pede = d.sinal_modo === 'forcar' ? true : d.sinal_modo === 'sem' ? false : precisaSinal(total, quantidade, regra)
  const { sinal, restante } = pede ? dividirSinal(total, pct) : { sinal: 0, restante: total }
  return { subtotal, desconto, frete: d.frete_valor, total, quantidade, pede_sinal: pede, sinal_percentual: pct, valor_sinal: sinal, valor_restante: restante }
}

export const numeroOrcamento = (n: number) => `ORC-${String(n).padStart(4, '0')}`
export const numeroPedido = (n: number) => `PED-${String(n).padStart(4, '0')}`

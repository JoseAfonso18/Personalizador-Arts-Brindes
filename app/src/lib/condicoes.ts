import { formatarBRL } from '@/lib/dinheiro'

export type RegraSinal = {
  sinal_percentual: number
  sinal_valor_minimo: number | null
  sinal_qtd_minima: number | null
}

/** Pede sinal quando a quantidade OU o valor total atingem o mínimo configurado. */
export function precisaSinal(total: number, quantidade: number, r: RegraSinal): boolean {
  const porValor = r.sinal_valor_minimo != null && total >= r.sinal_valor_minimo
  const porQtd = r.sinal_qtd_minima != null && quantidade >= r.sinal_qtd_minima
  return porValor || porQtd
}

/** Divide o total em sinal + restante (centavos arredondados no sinal). */
export function dividirSinal(total: number, percentual: number) {
  const sinal = Math.round(total * percentual) / 100
  return { sinal, restante: Math.round((total - sinal) * 100) / 100 }
}

export type VariaveisTexto = {
  percentual: number
  valor_sinal: number
  valor_restante: number
  formas: string
  validade: number
}

export const VARIAVEIS: { chave: keyof VariaveisTexto; descricao: string }[] = [
  { chave: 'percentual', descricao: 'percentual do sinal (ex.: 50%)' },
  { chave: 'valor_sinal', descricao: 'valor da entrada' },
  { chave: 'valor_restante', descricao: 'valor que falta' },
  { chave: 'formas', descricao: 'formas de pagamento' },
  { chave: 'validade', descricao: 'dias de validade' },
]

/** Troca {percentual}, {valor_sinal}... pelos valores do orçamento. */
export function montarTexto(modelo: string, v: VariaveisTexto): string {
  const pct = `${String(v.percentual).replace('.', ',')}%`
  const mapa: Record<string, string> = {
    percentual: pct,
    valor_sinal: formatarBRL(v.valor_sinal),
    valor_restante: formatarBRL(v.valor_restante),
    formas: v.formas,
    validade: String(v.validade),
  }
  return modelo.replace(/\{(\w+)\}/g, (m, k: string) => mapa[k] ?? m)
}

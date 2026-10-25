const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 1234.5 → "R$ 1.234,50" */
export function formatarBRL(valor: number | null | undefined): string {
  return valor == null || Number.isNaN(valor) ? '—' : fmt.format(valor)
}

/** Lê o que a pessoa digitou ("1.234,56", "150", "R$ 12,5", "12.50") → número, ou null se inválido. */
export function lerValor(texto: string): number | null {
  let t = texto.replace(/R\$|\s/g, '').trim()
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null
  return Math.round(Number(t) * 100) / 100
}

/** número → texto para o campo ("150,00") */
export function valorParaCampo(valor: number | null | undefined): string {
  return valor == null ? '' : valor.toFixed(2).replace('.', ',')
}

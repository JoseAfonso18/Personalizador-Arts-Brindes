/** Mesma regra da função preco_unitario do banco, para usar na tela. */
export type Faixa = { qtd_min: number; qtd_max: number | null; preco: number }

export function precoUnitario(faixas: Faixa[], quantidade: number, acrescimo = 0): number | null {
  const f = faixas.find((f) => quantidade >= f.qtd_min && (f.qtd_max == null || quantidade <= f.qtd_max))
  return f ? Math.round((f.preco + acrescimo) * 100) / 100 : null
}

export type ProblemasFaixas = { erros: string[]; avisos: string[] }

/** Confere as faixas antes de salvar: erros impedem salvar; avisos só alertam. */
export function conferirFaixas(faixas: Faixa[]): ProblemasFaixas {
  const erros: string[] = []
  const avisos: string[] = []
  if (faixas.length === 0) erros.push('Cadastre pelo menos uma faixa de preço.')

  faixas.forEach((f, i) => {
    const n = `Faixa ${i + 1}`
    if (!Number.isInteger(f.qtd_min) || f.qtd_min < 1) erros.push(`${n}: a quantidade mínima deve ser 1 ou mais.`)
    if (f.qtd_max != null && f.qtd_max < f.qtd_min) erros.push(`${n}: o máximo é menor que o mínimo.`)
    if (!(f.preco >= 0)) erros.push(`${n}: preço inválido.`)
  })
  if (erros.length) return { erros, avisos }

  const ord = [...faixas].sort((a, b) => a.qtd_min - b.qtd_min)
  for (let i = 1; i < ord.length; i++) {
    const ant = ord[i - 1]
    const atual = ord[i]
    const fimAnt = ant.qtd_max ?? Infinity
    if (atual.qtd_min <= fimAnt) {
      erros.push(`As faixas ${rotulo(ant)} e ${rotulo(atual)} se sobrepõem.`)
    } else if (atual.qtd_min > fimAnt + 1) {
      avisos.push(`Nenhuma faixa cobre de ${fimAnt + 1} a ${atual.qtd_min - 1} unidades.`)
    }
  }
  if (ord.length && ord[0].qtd_min > 1) avisos.push(`Nenhuma faixa cobre de 1 a ${ord[0].qtd_min - 1} unidades.`)
  const ultima = ord[ord.length - 1]
  if (ultima && ultima.qtd_max != null) avisos.push(`Acima de ${ultima.qtd_max} unidades não há preço. Deixe o máximo da última faixa vazio para "ou mais".`)
  return { erros, avisos }
}

export function rotulo(f: Pick<Faixa, 'qtd_min' | 'qtd_max'>): string {
  return f.qtd_max == null ? `${f.qtd_min}+` : f.qtd_min === f.qtd_max ? `${f.qtd_min}` : `${f.qtd_min}–${f.qtd_max}`
}

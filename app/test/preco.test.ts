import { describe, expect, it } from 'vitest'
import { conferirFaixas, precoUnitario, rotulo } from '@/lib/preco'
import { formatarBRL, lerValor, valorParaCampo } from '@/lib/dinheiro'

const faixas = [
  { qtd_min: 1, qtd_max: 9, preco: 150 },
  { qtd_min: 10, qtd_max: 49, preco: 135 },
  { qtd_min: 50, qtd_max: null, preco: 120 },
]

describe('precoUnitario', () => {
  it('acha a faixa certa e soma o acréscimo', () => {
    expect(precoUnitario(faixas, 1)).toBe(150)
    expect(precoUnitario(faixas, 10)).toBe(135)
    expect(precoUnitario(faixas, 500, 10)).toBe(130)
  })
  it('null quando nenhuma faixa cobre', () => {
    expect(precoUnitario([{ qtd_min: 1, qtd_max: 9, preco: 1 }], 10)).toBeNull()
  })
})

describe('conferirFaixas', () => {
  it('faixas corretas: sem erros nem avisos', () => {
    expect(conferirFaixas(faixas)).toEqual({ erros: [], avisos: [] })
  })
  it('sobreposição é erro (mesmo fora de ordem)', () => {
    const r = conferirFaixas([{ qtd_min: 10, qtd_max: null, preco: 1 }, { qtd_min: 1, qtd_max: 10, preco: 2 }])
    expect(r.erros[0]).toMatch(/sobrepõem/)
  })
  it('buraco e falta de "ou mais" são avisos', () => {
    const r = conferirFaixas([{ qtd_min: 1, qtd_max: 9, preco: 1 }, { qtd_min: 20, qtd_max: 30, preco: 1 }])
    expect(r.erros).toEqual([])
    expect(r.avisos.join(' ')).toMatch(/10 a 19/)
    expect(r.avisos.join(' ')).toMatch(/Acima de 30/)
  })
  it('valores inválidos são erro', () => {
    expect(conferirFaixas([]).erros).toHaveLength(1)
    expect(conferirFaixas([{ qtd_min: 0, qtd_max: null, preco: 1 }]).erros).toHaveLength(1)
    expect(conferirFaixas([{ qtd_min: 5, qtd_max: 2, preco: 1 }]).erros).toHaveLength(1)
    expect(conferirFaixas([{ qtd_min: 1, qtd_max: null, preco: NaN }]).erros).toHaveLength(1)
  })
  it('rótulos', () => {
    expect(rotulo({ qtd_min: 1, qtd_max: 9 })).toBe('1–9')
    expect(rotulo({ qtd_min: 50, qtd_max: null })).toBe('50+')
  })
})

describe('dinheiro', () => {
  it('lê o que a pessoa digita', () => {
    expect(lerValor('150')).toBe(150)
    expect(lerValor('1.234,56')).toBe(1234.56)
    expect(lerValor('R$ 12,5')).toBe(12.5)
    expect(lerValor('12.50')).toBe(12.5)
    expect(lerValor('abc')).toBeNull()
    expect(lerValor('')).toBeNull()
  })
  it('formata em reais', () => {
    expect(formatarBRL(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50')
    expect(valorParaCampo(150)).toBe('150,00')
  })
})

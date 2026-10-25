import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { dividirSinal, montarTexto, precisaSinal } from '@/lib/condicoes'
import { comoUsuario, criarBanco } from './banco'

const regra = { sinal_percentual: 50, sinal_valor_minimo: 1000, sinal_qtd_minima: 50 }

describe('regra do sinal', () => {
  it('pede quando a quantidade OU o valor atingem o mínimo', () => {
    expect(precisaSinal(999, 49, regra)).toBe(false)
    expect(precisaSinal(1000, 1, regra)).toBe(true)
    expect(precisaSinal(100, 50, regra)).toBe(true)
  })
  it('critério vazio é ignorado', () => {
    expect(precisaSinal(5000, 1, { ...regra, sinal_valor_minimo: null })).toBe(false)
    expect(precisaSinal(1, 1, { ...regra, sinal_valor_minimo: null, sinal_qtd_minima: null })).toBe(false)
  })
  it('divide sinal e restante', () => {
    expect(dividirSinal(1250, 50)).toEqual({ sinal: 625, restante: 625 })
    expect(dividirSinal(100.01, 30)).toEqual({ sinal: 30, restante: 70.01 })
  })
})

describe('texto das condições', () => {
  it('troca as variáveis', () => {
    const t = montarTexto('Entrada de {percentual} ({valor_sinal}), resto {valor_restante}. {formas}. {validade} dias. {xyz}', {
      percentual: 50,
      valor_sinal: 625,
      valor_restante: 625,
      formas: 'Pix',
      validade: 7,
    })
    expect(t.replace(/\s/g, ' ')).toBe('Entrada de 50% (R$ 625,00), resto R$ 625,00. Pix. 7 dias. {xyz}')
  })
})

describe('tabela configuracoes', () => {
  let db: PGlite
  beforeEach(async () => {
    db = await criarBanco()
  })
  it('já nasce com os padrões e só tem uma linha', async () => {
    const r = await db.query<{ sinal_percentual: string; sinal_valor_minimo: string; sinal_qtd_minima: number; validade_dias: number }>('select * from configuracoes')
    expect(r.rows).toHaveLength(1)
    expect(Number(r.rows[0].sinal_percentual)).toBe(50)
    expect(Number(r.rows[0].sinal_valor_minimo)).toBe(1000)
    expect(r.rows[0].sinal_qtd_minima).toBe(50)
    expect(r.rows[0].validade_dias).toBe(7)
    await expect(db.query('insert into configuracoes (id) values (false)')).rejects.toThrow()
  })
  it('logado edita; não consegue criar nem apagar; percentual fora da faixa é recusado', async () => {
    await comoUsuario(db, async () => {
      await db.query('update configuracoes set sinal_percentual = 30')
      await expect(db.query('update configuracoes set sinal_percentual = 150')).rejects.toThrow()
      await db.query('delete from configuracoes')
    })
    const r = await db.query<{ sinal_percentual: string }>('select sinal_percentual from configuracoes')
    expect(r.rows).toHaveLength(1)
    expect(Number(r.rows[0].sinal_percentual)).toBe(30)
  })
})

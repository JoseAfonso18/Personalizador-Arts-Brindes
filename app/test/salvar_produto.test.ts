import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco } from './banco'

let db: PGlite

async function salvar(p: object) {
  return comoUsuario(db, async () => {
    const r = await db.query<{ id: string }>(`select salvar_produto($1::jsonb) as id`, [JSON.stringify(p)])
    return r.rows[0].id
  })
}
async function contar(tabela: string) {
  const r = await db.query<{ n: string }>(`select count(*) as n from ${tabela}`)
  return Number(r.rows[0].n)
}

beforeEach(async () => {
  db = await criarBanco()
})

describe('salvar_produto', () => {
  const copo = {
    nome: 'Copo Stanley 473 ml',
    tipo: 'produto',
    faixas: [
      { qtd_min: 1, qtd_max: 9, preco: 150 },
      { qtd_min: 10, qtd_max: null, preco: 135 },
    ],
    variacoes: [
      { nome: 'Preto', acrescimo: 10, estoque: 5, estoque_minimo: 2 },
      { nome: 'Branco', acrescimo: 0, estoque: 3, estoque_minimo: 2 },
    ],
  }

  it('cria produto com faixas e cores', async () => {
    const id = await salvar(copo)
    expect(id).toBeTruthy()
    expect(await contar('faixas_preco')).toBe(2)
    expect(await contar('variacoes')).toBe(2)
  })

  it('ao editar, mantém o id das cores existentes, remove as que saíram e cria as novas', async () => {
    const id = await salvar(copo)
    const antes = await db.query<{ id: string; nome: string }>(`select id, nome from variacoes order by nome`)
    const preto = antes.rows.find((v) => v.nome === 'Preto')!
    await salvar({
      ...copo,
      id,
      nome: 'Copo Stanley 473ml',
      faixas: [{ qtd_min: 1, qtd_max: null, preco: 140 }],
      variacoes: [
        { id: preto.id, nome: 'Preto Fosco', acrescimo: 12, estoque: 7, estoque_minimo: 2 },
        { nome: 'Verde', acrescimo: 0, estoque: 1, estoque_minimo: 0 },
      ],
    })
    const depois = await db.query<{ id: string; nome: string; estoque: number }>(`select id, nome, estoque from variacoes order by nome`)
    expect(depois.rows.map((v) => v.nome)).toEqual(['Preto Fosco', 'Verde'])
    expect(depois.rows[0].id).toBe(preto.id)
    expect(depois.rows[0].estoque).toBe(7)
    expect(await contar('faixas_preco')).toBe(1)
    const p = await db.query<{ nome: string }>(`select nome from produtos`)
    expect(p.rows[0].nome).toBe('Copo Stanley 473ml')
  })

  it('se as faixas se sobrepõem, não salva nada', async () => {
    await expect(
      salvar({ ...copo, faixas: [{ qtd_min: 1, qtd_max: 10, preco: 150 }, { qtd_min: 5, qtd_max: null, preco: 140 }] }),
    ).rejects.toThrow(/faixas_sem_sobreposicao/)
    expect(await contar('produtos')).toBe(0)
    expect(await contar('variacoes')).toBe(0)
  })

  it('cor repetida dá erro e não salva', async () => {
    await expect(salvar({ ...copo, variacoes: [{ nome: 'Preto' }, { nome: 'Preto' }] })).rejects.toThrow()
    expect(await contar('produtos')).toBe(0)
  })

  it('serviço de gravação ignora cores; virar serviço apaga as cores', async () => {
    const id = await salvar(copo)
    await salvar({ ...copo, id, tipo: 'servico_gravacao' })
    expect(await contar('variacoes')).toBe(0)
    const s = await salvar({ nome: 'Gravação', tipo: 'servico_gravacao', faixas: [{ qtd_min: 1, preco: 25 }], variacoes: [{ nome: 'X' }] })
    expect(s).toBeTruthy()
    expect(await contar('variacoes')).toBe(0)
  })

  it('quem não está logado não consegue salvar', async () => {
    await db.exec('set role anon')
    await expect(db.query(`select salvar_produto($1::jsonb)`, [JSON.stringify(copo)])).rejects.toThrow()
    await db.exec('reset role')
  })
})

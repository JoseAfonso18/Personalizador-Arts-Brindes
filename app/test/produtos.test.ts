import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco, USUARIO } from './banco'

let db: PGlite

async function criarProduto(nome = 'Copo Stanley 473 ml', tipo = 'produto') {
  const r = await db.query<{ id: string }>(`insert into produtos (nome, tipo) values ($1, $2) returning id`, [nome, tipo])
  return r.rows[0].id
}
async function faixa(produto: string, min: number, max: number | null, preco: number) {
  await db.query(`insert into faixas_preco (produto_id, qtd_min, qtd_max, preco) values ($1, $2, $3, $4)`, [produto, min, max, preco])
}
async function variacao(produto: string, nome: string, acrescimo = 0) {
  const r = await db.query<{ id: string }>(
    `insert into variacoes (produto_id, nome, acrescimo) values ($1, $2, $3) returning id`,
    [produto, nome, acrescimo],
  )
  return r.rows[0].id
}
async function preco(produto: string, qtd: number, variacaoId: string | null = null) {
  const r = await db.query<{ p: string | null }>(`select preco_unitario($1, $2, $3) as p`, [produto, qtd, variacaoId])
  return r.rows[0].p === null ? null : Number(r.rows[0].p)
}

beforeEach(async () => {
  db = await criarBanco()
})

describe('preço por faixa de quantidade', () => {
  it('usa a faixa em que a quantidade cai, incluindo "ou mais"', async () => {
    const copo = await criarProduto()
    await faixa(copo, 1, 9, 150)
    await faixa(copo, 10, 49, 135)
    await faixa(copo, 50, null, 120)
    expect(await preco(copo, 1)).toBe(150)
    expect(await preco(copo, 9)).toBe(150)
    expect(await preco(copo, 10)).toBe(135)
    expect(await preco(copo, 49)).toBe(135)
    expect(await preco(copo, 50)).toBe(120)
    expect(await preco(copo, 1000)).toBe(120)
  })

  it('soma o acréscimo da cor', async () => {
    const copo = await criarProduto()
    await faixa(copo, 1, null, 150)
    const preto = await variacao(copo, 'Preto', 10)
    const branco = await variacao(copo, 'Branco')
    expect(await preco(copo, 5, preto)).toBe(160)
    expect(await preco(copo, 5, branco)).toBe(150)
  })

  it('devolve vazio quando nenhuma faixa cobre a quantidade', async () => {
    const copo = await criarProduto()
    await faixa(copo, 1, 9, 150)
    await faixa(copo, 20, null, 120)
    expect(await preco(copo, 15)).toBeNull()
    expect(await preco(copo, 0)).toBeNull()
  })

  it('não aceita faixas sobrepostas no mesmo produto', async () => {
    const copo = await criarProduto()
    await faixa(copo, 1, 9, 150)
    await expect(faixa(copo, 5, 20, 140)).rejects.toThrow()
    await faixa(copo, 10, null, 130)
    await expect(faixa(copo, 100, 200, 110)).rejects.toThrow() // cai dentro do "10 ou mais"
  })

  it('aceita as mesmas faixas em produtos diferentes', async () => {
    const a = await criarProduto('Copo')
    const b = await criarProduto('Caneca')
    await faixa(a, 1, 9, 150)
    await expect(faixa(b, 1, 9, 120)).resolves.toBeUndefined()
  })

  it('recusa faixa inválida (máximo menor que mínimo, mínimo zero, preço negativo)', async () => {
    const copo = await criarProduto()
    await expect(faixa(copo, 10, 5, 100)).rejects.toThrow()
    await expect(faixa(copo, 0, 5, 100)).rejects.toThrow()
    await expect(faixa(copo, 1, 5, -1)).rejects.toThrow()
  })
})

describe('variações (cores)', () => {
  it('não repete o nome da cor no mesmo produto', async () => {
    const copo = await criarProduto()
    await variacao(copo, 'Preto')
    await expect(variacao(copo, 'Preto')).rejects.toThrow()
  })

  it('serviço de gravação não tem variação', async () => {
    const servico = await criarProduto('Gravação (item do cliente)', 'servico_gravacao')
    await faixa(servico, 1, null, 25)
    await expect(variacao(servico, 'Preto')).rejects.toThrow()
    expect(await preco(servico, 3)).toBe(25)
  })

  it('apagar o produto apaga as faixas e cores', async () => {
    const copo = await criarProduto()
    await faixa(copo, 1, null, 150)
    await variacao(copo, 'Preto')
    await db.query(`delete from produtos where id = $1`, [copo])
    const r = await db.query<{ n: number }>(`select (select count(*) from faixas_preco) + (select count(*) from variacoes) as n`)
    expect(Number(r.rows[0].n)).toBe(0)
  })
})

describe('acesso e auditoria', () => {
  it('quem não está logado não vê nada', async () => {
    await criarProduto()
    await db.exec('set role anon')
    const r = await db.query(`select * from produtos`)
    await db.exec('reset role')
    expect(r.rows).toHaveLength(0)
  })

  it('usuário logado cria produto e fica registrado como autor', async () => {
    const r = await comoUsuario(db, () =>
      db.query<{ created_by: string; updated_by: string }>(
        `insert into produtos (nome) values ('Caneta metal') returning created_by, updated_by`,
      ),
    )
    expect(r.rows[0].created_by).toBe(USUARIO)
    expect(r.rows[0].updated_by).toBe(USUARIO)
  })

  it('usuário logado lê, edita faixas e calcula preço', async () => {
    const copo = await criarProduto()
    await comoUsuario(db, async () => {
      await faixa(copo, 1, null, 99)
      expect(await preco(copo, 1)).toBe(99)
      const r = await db.query(`select * from produtos`)
      expect(r.rows).toHaveLength(1)
    })
  })
})

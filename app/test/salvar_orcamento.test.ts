import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco } from './banco'

let db: PGlite
let cliente: string
let copo: string
let preto: string
let branco: string

const q = <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => comoUsuario(db, () => db.query<T>(sql, p))
const salvar = async (p: object) => (await q<{ id: string }>(`select salvar_orcamento($1::jsonb) as id`, [JSON.stringify(p)])).rows[0].id

beforeEach(async () => {
  db = await criarBanco()
  cliente = (await db.query<{ id: string }>(`insert into clientes (tipo, nome) values ('pj','Empresa X') returning id`)).rows[0].id
  copo = (await db.query<{ id: string }>(`insert into produtos (nome) values ('Copo') returning id`)).rows[0].id
  await db.query(`insert into faixas_preco (produto_id, qtd_min, qtd_max, preco) values ($1,1,49,150),($1,50,null,120)`, [copo])
  preto = (await db.query<{ id: string }>(`insert into variacoes (produto_id, nome, acrescimo) values ($1,'Preto',10) returning id`, [copo])).rows[0].id
  branco = (await db.query<{ id: string }>(`insert into variacoes (produto_id, nome) values ($1,'Branco') returning id`, [copo])).rows[0].id
})

const base = () => ({
  cliente_id: cliente,
  itens: [
    { produto_id: copo, variacao_id: preto, descricao: 'Copo — Preto', quantidade: 30, preco_unitario: 130 },
    { produto_id: copo, variacao_id: branco, descricao: 'Copo — Branco', quantidade: 20, preco_unitario: 120, detalhe: 'Logo frente' },
  ],
})

describe('salvar_orcamento', () => {
  it('cria com itens em ordem e edita substituindo os itens', async () => {
    const id = await salvar(base())
    let itens = await db.query<{ descricao: string; ordem: number }>(`select descricao, ordem from orcamento_itens order by ordem`)
    expect(itens.rows.map((i) => i.descricao)).toEqual(['Copo — Preto', 'Copo — Branco'])
    await salvar({ ...base(), id, itens: [{ descricao: 'Item avulso', quantidade: 1, preco_unitario: 10 }], prazo_entrega: '2026-12-10' })
    itens = await db.query(`select descricao, ordem from orcamento_itens`)
    expect(itens.rows).toHaveLength(1)
    const o = await db.query<{ prazo_entrega: string }>(`select prazo_entrega::text from orcamentos`)
    expect(o.rows[0].prazo_entrega).toBe('2026-12-10')
  })

  it('sem itens não salva; desconto sem motivo não salva', async () => {
    await expect(salvar({ cliente_id: cliente, itens: [] })).rejects.toThrow(/pelo menos um item/)
    await expect(salvar({ ...base(), desconto_valor: 5 })).rejects.toThrow()
    expect((await db.query(`select * from orcamentos`)).rows).toHaveLength(0)
  })

  it('aprovado não pode ser alterado', async () => {
    const id = await salvar(base())
    await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [id])
    await expect(salvar({ ...base(), id })).rejects.toThrow(/aprovado/)
  })

  it('preço da faixa soma as cores do mesmo produto (30 pretos + 20 brancos = 50)', async () => {
    const id = await salvar(base())
    const r = await db.query<{ p: string }>(`select preco_orcamento($1,$2,$3) as p`, [id, copo, preto])
    expect(Number(r.rows[0].p)).toBe(130) // faixa 50+ (120) + acréscimo preto (10)
  })

  it('renovar atualiza preços pela tabela e a validade', async () => {
    const id = await salvar({ ...base(), validade: '2020-01-01' })
    await db.query(`update faixas_preco set preco = 110 where qtd_min = 50`)
    await q(`select renovar_orcamento($1)`, [id])
    const itens = await db.query<{ descricao: string; preco_unitario: string }>(`select descricao, preco_unitario from orcamento_itens order by ordem`)
    expect(itens.rows.map((i) => Number(i.preco_unitario))).toEqual([120, 110])
    const o = await db.query<{ situacao: string }>(`select situacao from orcamentos_lista`)
    expect(o.rows[0].situacao).toBe('rascunho')
  })

  it('duplicar cria outro orçamento com os mesmos itens e número novo', async () => {
    const id = await salvar(base())
    const novo = (await q<{ id: string }>(`select duplicar_orcamento($1) as id`, [id])).rows[0].id
    expect(novo).not.toBe(id)
    const r = await db.query<{ n: string }>(`select count(*) as n from orcamento_itens where orcamento_id = $1`, [novo])
    expect(Number(r.rows[0].n)).toBe(2)
    const nums = await db.query<{ numero: number }>(`select numero from orcamentos order by numero`)
    expect(nums.rows[1].numero).toBe(nums.rows[0].numero + 1)
  })

  it('quem não está logado não salva', async () => {
    await db.exec('set role anon')
    await expect(db.query(`select salvar_orcamento($1::jsonb)`, [JSON.stringify(base())])).rejects.toThrow()
    await db.exec('reset role')
  })
})

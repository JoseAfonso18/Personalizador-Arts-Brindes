import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco, USUARIO } from './banco'

let db: PGlite
let orc: { id: string; token: string }

beforeEach(async () => {
  db = await criarBanco()
  const cli = (await db.query<{ id: string }>(`insert into clientes (tipo, nome, nome_fantasia) values ('pj','MERCADO LTDA','Mercado Bom') returning id`)).rows[0].id
  orc = (await db.query<{ id: string; token: string }>(`insert into orcamentos (cliente_id, prazo_entrega, desconto_valor, desconto_motivo) values ($1, '2020-02-01', 50, 'Cliente antigo') returning id, token`, [cli])).rows[0]
  await db.query(`insert into orcamento_itens (orcamento_id, ordem, descricao, detalhe, quantidade, preco_unitario) values ($1,0,'Copo — Preto','Logo',60,130),($1,1,'Copo — Branco',null,40,120)`, [orc.id])
})

const pedidos = () => db.query<Record<string, string | number | boolean | null>>(`select * from pedidos`)

describe('pedidos', () => {
  it('aprovar o orçamento (pela loja) cria o pedido com itens e valores', async () => {
    await comoUsuario(db, () => db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc.id]))
    const p = (await pedidos()).rows
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ status: 'aprovado', origem: 'orcamento', orcamento_id: orc.id, created_by: USUARIO })
    expect(Number(p[0].subtotal)).toBe(12600)
    expect(Number(p[0].desconto)).toBe(50)
    expect(Number(p[0].total)).toBe(12550)
    expect(Number(p[0].valor_sinal)).toBe(6275)
    const itens = await db.query<{ descricao: string }>(`select descricao from pedido_itens order by ordem`)
    expect(itens.rows.map((i) => i.descricao)).toEqual(['Copo — Preto', 'Copo — Branco'])
    const h = await db.query<{ para: string; por: string }>(`select para, por from pedido_historico`)
    expect(h.rows).toEqual([{ para: 'aprovado', por: USUARIO }])
  })

  it('aprovar pelo link (cliente, sem login) também cria o pedido e registra quem aprovou', async () => {
    await db.exec('set role anon')
    await db.query(`select aprovar_orcamento_publico($1, 'Carlos Souza')`, [orc.token])
    await db.exec('reset role')
    expect((await pedidos()).rows).toHaveLength(1)
    const h = await db.query<{ para: string; por: string | null; por_nome: string }>(`select para, por, por_nome from pedido_historico`)
    expect(h.rows[0]).toMatchObject({ para: 'aprovado', por: null, por_nome: 'Carlos Souza (pelo link)' })
  })

  it('não duplica o pedido se o status for mexido de novo', async () => {
    await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc.id])
    await db.query(`update orcamentos set observacao = 'x' where id = $1`, [orc.id])
    await db.query(`update orcamentos set status = 'enviado' where id = $1`, [orc.id])
    await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc.id])
    expect((await pedidos()).rows).toHaveLength(1)
  })

  it('mudança de status entra no histórico com quem fez; entregue grava a data', async () => {
    await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc.id])
    const id = (await pedidos()).rows[0].id as string
    await comoUsuario(db, async () => {
      await db.query(`update pedidos set status = 'gravando' where id = $1`, [id])
      await db.query(`update pedidos set nota_venda = '123' where id = $1`, [id])
      await db.query(`update pedidos set status = 'entregue' where id = $1`, [id])
    })
    const h = await db.query<{ de: string | null; para: string; por: string | null }>(`select de, para, por from pedido_historico order by id`)
    expect(h.rows.map((x) => `${x.de}>${x.para}`)).toEqual(['null>aprovado', 'aprovado>gravando', 'gravando>entregue'])
    expect(h.rows[2].por).toBe(USUARIO)
    expect((await pedidos()).rows[0].entregue_em).toBeTruthy()
  })

  it('lista mostra cliente, resumo, quantidade e atrasado', async () => {
    await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc.id])
    const l = await db.query<{ cliente_nome: string; resumo: string; quantidade: number; atrasado: boolean }>(`select * from pedidos_lista`)
    expect(l.rows[0]).toMatchObject({ cliente_nome: 'Mercado Bom', quantidade: 100, atrasado: true })
    expect(l.rows[0].resumo).toBe('60× Copo — Preto · 40× Copo — Branco')
    await db.query(`update pedidos set status = 'entregue'`)
    expect((await db.query<{ atrasado: boolean }>(`select atrasado from pedidos_lista`)).rows[0].atrasado).toBe(false)
  })

  it('anônimo não vê pedidos nem o histórico; ninguém edita o histórico', async () => {
    await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc.id])
    await db.exec('set role anon')
    expect((await db.query('select * from pedidos')).rows).toHaveLength(0)
    expect((await db.query('select * from pedido_historico')).rows).toHaveLength(0)
    await db.exec('reset role')
    await comoUsuario(db, async () => {
      await db.query(`delete from pedido_historico`)
    })
    expect((await db.query('select * from pedido_historico')).rows).toHaveLength(1)
  })
})

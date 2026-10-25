import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco, USUARIO } from './banco'

let db: PGlite
let cliente: string
const vender = async (p: object) => (await comoUsuario(db, () => db.query<{ id: string }>(`select venda_rapida($1::jsonb) as id`, [JSON.stringify(p)]))).rows[0].id
const item = { descricao: 'Chaveiro abridor', quantidade: 2, preco_unitario: 15 }

beforeEach(async () => {
  db = await criarBanco()
  cliente = (await db.query<{ id: string }>(`insert into clientes (tipo, nome) values ('pf','Maria') returning id`)).rows[0].id
})

describe('venda rápida', () => {
  it('consumidor no Pix: pedido entregue e pago, com histórico', async () => {
    const id = await vender({ itens: [item, { descricao: 'Gravação (item do cliente)', quantidade: 1, preco_unitario: 25, item_do_cliente: true }], forma: 'pix', entregue: true })
    const l = (await db.query<Record<string, unknown>>(`select * from pedidos_lista where id = $1`, [id])).rows[0]
    expect(l).toMatchObject({ origem: 'venda_rapida', status: 'entregue', cliente_nome: 'Consumidor', situacao_pagamento: 'pago', quantidade: 3 })
    expect(Number(l.total)).toBe(55)
    const g = await db.query<{ valor: string; forma: string; created_by: string }>(`select valor, forma, created_by from pagamentos`)
    expect(g.rows[0]).toMatchObject({ forma: 'pix', created_by: USUARIO })
    expect(Number(g.rows[0].valor)).toBe(55)
    expect((await db.query(`select * from pedido_historico where pedido_id = $1`, [id])).rows).toHaveLength(1)
    expect((await db.query<{ entregue_em: string }>(`select entregue_em from pedidos`)).rows[0].entregue_em).toBeTruthy()
  })

  it('"entregar depois" vai para o quadro como aprovado', async () => {
    await vender({ itens: [item], forma: 'dinheiro', entregue: false, cliente_id: cliente })
    const l = (await db.query<{ status: string; situacao_pagamento: string }>(`select status, situacao_pagamento from pedidos_lista`)).rows[0]
    expect(l).toEqual({ status: 'aprovado', situacao_pagamento: 'pago' })
  })

  it('desconto precisa de motivo e entra na observação', async () => {
    await expect(vender({ itens: [item], forma: 'pix', desconto: 5 })).rejects.toThrow(/motivo/)
    await vender({ itens: [item], forma: 'pix', desconto: 5, desconto_motivo: 'Cliente de sempre' })
    const p = (await db.query<{ total: string; observacao: string }>(`select total, observacao from pedidos`)).rows[0]
    expect(Number(p.total)).toBe(25)
    expect(p.observacao).toContain('Cliente de sempre')
  })

  it('fiado: só cliente de confiança e com data; não cria pagamento', async () => {
    await expect(vender({ itens: [item], forma: 'fiado', vencimento: '2030-01-10' })).rejects.toThrow(/confiança/)
    await expect(vender({ itens: [item], forma: 'fiado', cliente_id: cliente, vencimento: '2030-01-10' })).rejects.toThrow(/confiança/)
    await db.query(`update clientes set confianca = true`)
    await expect(vender({ itens: [item], forma: 'fiado', cliente_id: cliente })).rejects.toThrow(/quando/)
    await vender({ itens: [item], forma: 'fiado', cliente_id: cliente, vencimento: '2030-01-10' })
    expect((await db.query(`select * from pagamentos`)).rows).toHaveLength(0)
    expect((await db.query<{ situacao_pagamento: string }>(`select situacao_pagamento from pedidos_lista`)).rows[0].situacao_pagamento).toBe('fiado')
  })

  it('sem itens ou forma inválida não vende; nada fica pela metade', async () => {
    await expect(vender({ itens: [], forma: 'pix' })).rejects.toThrow(/item/)
    await expect(vender({ itens: [item], forma: 'cheque' })).rejects.toThrow(/inválida/)
    expect((await db.query(`select * from pedidos`)).rows).toHaveLength(0)
  })

  it('anônimo não vende', async () => {
    await db.exec('set role anon')
    await expect(db.query(`select venda_rapida($1::jsonb)`, [JSON.stringify({ itens: [item], forma: 'pix' })])).rejects.toThrow()
    await db.exec('reset role')
  })
})

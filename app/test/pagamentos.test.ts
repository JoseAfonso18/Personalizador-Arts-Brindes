import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco, USUARIO } from './banco'

let db: PGlite
let pedido: string
let cliente: string

beforeEach(async () => {
  db = await criarBanco()
  cliente = (await db.query<{ id: string }>(`insert into clientes (tipo, nome) values ('pj','Empresa X') returning id`)).rows[0].id
  const orc = (await db.query<{ id: string }>(`insert into orcamentos (cliente_id) values ($1) returning id`, [cliente])).rows[0].id
  await db.query(`insert into orcamento_itens (orcamento_id, descricao, quantidade, preco_unitario) values ($1,'Copo',10,120)`, [orc]) // 1200 → sinal 600
  await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc])
  pedido = (await db.query<{ id: string }>(`select id from pedidos`)).rows[0].id
})

const pagar = (valor: number, forma = 'pix') => comoUsuario(db, () => db.query(`insert into pagamentos (pedido_id, valor, forma) values ($1,$2,$3) returning created_by`, [pedido, valor, forma]))
const linha = async () => (await db.query<{ pago: string; saldo: string; situacao_pagamento: string }>(`select pago, saldo, situacao_pagamento from pedidos_lista`)).rows[0]

describe('pagamentos', () => {
  it('sinal pendente → parcial/sinal pago → pago', async () => {
    expect((await linha()).situacao_pagamento).toBe('sinal_pendente')
    await pagar(300)
    expect((await linha()).situacao_pagamento).toBe('sinal_pendente')
    const r = await pagar(300, 'dinheiro')
    expect((r.rows[0] as { created_by: string }).created_by).toBe(USUARIO)
    let l = await linha()
    expect(l.situacao_pagamento).toBe('parcial')
    expect(Number(l.saldo)).toBe(600)
    await pagar(600, 'cartao')
    l = await linha()
    expect(l.situacao_pagamento).toBe('pago')
    expect(Number(l.saldo)).toBe(0)
  })

  it('não aceita receber mais que o saldo; valor zero ou forma inválida', async () => {
    await pagar(1000)
    await expect(pagar(300)).rejects.toThrow(/maior que o saldo/)
    await expect(pagar(0)).rejects.toThrow()
    await expect(pagar(10, 'cheque')).rejects.toThrow()
  })

  it('fiado só para cliente de confiança; vencido aparece como fiado_vencido', async () => {
    await expect(comoUsuario(db, () => db.query(`update pedidos set vencimento = current_date + 10`))).rejects.toThrow(/confiança/)
    await db.query(`update clientes set confianca = true where id = $1`, [cliente])
    await comoUsuario(db, () => db.query(`update pedidos set vencimento = current_date + 10`))
    expect((await linha()).situacao_pagamento).toBe('fiado')
    await db.query(`update pedidos set vencimento = current_date - 1`)
    expect((await linha()).situacao_pagamento).toBe('fiado_vencido')
    await pagar(1200)
    expect((await linha()).situacao_pagamento).toBe('pago')
  })

  it('pedido sem sinal começa "a receber"; cancelado sai da cobrança', async () => {
    await db.query(`update pedidos set valor_sinal = 0`)
    expect((await linha()).situacao_pagamento).toBe('a_receber')
    await db.query(`update pedidos set status = 'cancelado'`)
    expect((await linha()).situacao_pagamento).toBe('cancelado')
  })

  it('anônimo não vê pagamentos', async () => {
    await pagar(100)
    await db.exec('set role anon')
    expect((await db.query('select * from pagamentos')).rows).toHaveLength(0)
    await db.exec('reset role')
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { calcularTotais, numeroOrcamento, type DadosCalculo } from '@/lib/orcamento'
import { comoUsuario, criarBanco, USUARIO } from './banco'

let db: PGlite
let cliente: string
const regra = { sinal_percentual: 50, sinal_valor_minimo: 1000, sinal_qtd_minima: 50 }

async function novoOrcamento(campos: Record<string, unknown> = {}) {
  const c = { cliente_id: cliente, ...campos }
  const k = Object.keys(c)
  const r = await db.query<{ id: string; numero: number; validade: string; token: string }>(
    `insert into orcamentos (${k.join(',')}) values (${k.map((_, i) => `$${i + 1}`).join(',')}) returning id, numero, validade::text, token`,
    Object.values(c),
  )
  return r.rows[0]
}
async function item(orc: string, quantidade: number, preco: number, adicional = 0) {
  await db.query(`insert into orcamento_itens (orcamento_id, descricao, quantidade, preco_unitario, adicional) values ($1,'Item',$2,$3,$4)`, [orc, quantidade, preco, adicional])
}
async function totais(orc: string) {
  const r = await db.query<Record<string, string | number | boolean>>(`select * from orcamento_totais($1)`, [orc])
  const t = r.rows[0]
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, typeof v === 'string' ? Number(v) : v]))
}

beforeEach(async () => {
  db = await criarBanco()
  cliente = (await db.query<{ id: string }>(`insert into clientes (tipo, nome) values ('pj','Empresa X') returning id`)).rows[0].id
})

describe('orçamentos no banco', () => {
  it('numera em sequência, gera token e validade de 7 dias', async () => {
    const a = await novoOrcamento()
    const b = await novoOrcamento()
    expect(b.numero).toBe(a.numero + 1)
    expect(numeroOrcamento(a.numero)).toMatch(/^ORC-\d{4}$/)
    expect(a.token).toHaveLength(64)
    expect(a.token).not.toBe(b.token)
    const dias = (new Date(a.validade).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86400000
    expect(dias).toBe(7)
  })

  it('desconto sem motivo é recusado; percentual acima de 100 também', async () => {
    await expect(novoOrcamento({ desconto_valor: 10 })).rejects.toThrow(/desconto_com_motivo/)
    await expect(novoOrcamento({ desconto_tipo: 'percentual', desconto_valor: 120, desconto_motivo: 'x' })).rejects.toThrow()
    await expect(novoOrcamento({ desconto_valor: 10, desconto_motivo: 'Cliente antigo' })).resolves.toBeTruthy()
  })

  it('calcula totais e sinal automático pela regra', async () => {
    const o = await novoOrcamento()
    await item(o.id, 10, 135)
    let t = await totais(o.id)
    expect(t).toMatchObject({ subtotal: 1350, total: 1350, quantidade: 10, pede_sinal: true, valor_sinal: 675, valor_restante: 675 })
    const p = await novoOrcamento()
    await item(p.id, 2, 150)
    t = await totais(p.id)
    expect(t).toMatchObject({ total: 300, pede_sinal: false, valor_sinal: 0, valor_restante: 300 })
  })

  it('desconto %, frete repassado/absorvido, adicional e sinal manual', async () => {
    const o = await novoOrcamento({ desconto_tipo: 'percentual', desconto_valor: 10, desconto_motivo: 'Fechou 20', frete_valor: 30, sinal_modo: 'forcar', sinal_percentual: 30 })
    await item(o.id, 20, 40, 5) // 20 × 45 = 900
    let t = await totais(o.id)
    expect(t).toMatchObject({ subtotal: 900, desconto: 90, frete: 30, total: 840, pede_sinal: true, sinal_percentual: 30, valor_sinal: 252, valor_restante: 588 })
    await db.query(`update orcamentos set frete_repassado = false, sinal_modo = 'sem' where id = $1`, [o.id])
    t = await totais(o.id)
    expect(t).toMatchObject({ total: 810, pede_sinal: false, valor_restante: 810 })
  })

  it('a conta da tela é igual à do banco', async () => {
    const dados: DadosCalculo = {
      itens: [
        { quantidade: 7, preco_unitario: 133.33, adicional: 2.5 },
        { quantidade: 45, preco_unitario: 18.9, adicional: 0 },
      ],
      desconto_tipo: 'percentual',
      desconto_valor: 7.5,
      frete_valor: 42.1,
      frete_repassado: true,
      sinal_modo: 'auto',
      sinal_percentual: null,
    }
    const o = await novoOrcamento({ desconto_tipo: 'percentual', desconto_valor: 7.5, desconto_motivo: 'x', frete_valor: 42.1 })
    for (const i of dados.itens) await item(o.id, i.quantidade, i.preco_unitario, i.adicional)
    const t = await totais(o.id)
    const tela = calcularTotais(dados, regra)
    for (const k of ['subtotal', 'desconto', 'total', 'valor_sinal', 'valor_restante', 'quantidade'] as const) expect(tela[k]).toBeCloseTo(t[k] as number, 2)
    expect(tela.pede_sinal).toBe(t.pede_sinal)
  })

  it('lista mostra cliente, total e marca vencido como expirado', async () => {
    const o = await novoOrcamento({ validade: '2020-01-01' })
    await item(o.id, 1, 10)
    const r = await db.query<{ cliente_nome: string; total: string; situacao: string }>(`select cliente_nome, total, situacao from orcamentos_lista`)
    expect(r.rows[0]).toMatchObject({ cliente_nome: 'Empresa X', situacao: 'expirado' })
    expect(Number(r.rows[0].total)).toBe(10)
  })

  it('apagar orçamento apaga os itens; não dá para apagar cliente com orçamento', async () => {
    const o = await novoOrcamento()
    await item(o.id, 1, 10)
    await expect(db.query(`delete from clientes where id = $1`, [cliente])).rejects.toThrow()
    await db.query(`delete from orcamentos where id = $1`, [o.id])
    expect((await db.query(`select * from orcamento_itens`)).rows).toHaveLength(0)
  })

  it('só logado acessa; autor registrado', async () => {
    await novoOrcamento()
    await db.exec('set role anon')
    expect((await db.query('select * from orcamentos')).rows).toHaveLength(0)
    expect((await db.query('select * from orcamentos_lista')).rows).toHaveLength(0)
    await db.exec('reset role')
    const r = await comoUsuario(db, () => db.query<{ created_by: string }>(`insert into orcamentos (cliente_id) values ($1) returning created_by`, [cliente]))
    expect(r.rows[0].created_by).toBe(USUARIO)
  })
})

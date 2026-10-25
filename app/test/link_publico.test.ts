import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { criarBanco } from './banco'

let db: PGlite
let token: string
let orcId: string

async function comoAnonimo<T>(fn: () => Promise<T>) {
  await db.exec('set role anon')
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}
const publico = (t: string) =>
  comoAnonimo(async () => (await db.query<{ o: Record<string, unknown> | null }>(`select orcamento_publico($1) as o`, [t])).rows[0].o)
const aprovar = (t: string, nome: string) =>
  comoAnonimo(async () => (await db.query<{ o: Record<string, unknown> }>(`select aprovar_orcamento_publico($1,$2) as o`, [t, nome])).rows[0].o)

beforeEach(async () => {
  db = await criarBanco()
  const cli = (await db.query<{ id: string }>(`insert into clientes (tipo, nome, nome_fantasia, cpf_cnpj, celular) values ('pj','MERCADO LTDA','Mercado Bom','11222333000181','(42) 99999-0000') returning id`)).rows[0].id
  const o = (await db.query<{ id: string; token: string }>(`insert into orcamentos (cliente_id) values ($1) returning id, token`, [cli])).rows[0]
  orcId = o.id
  token = o.token
  await db.query(`insert into orcamento_itens (orcamento_id, descricao, detalhe, quantidade, preco_unitario) values ($1,'Copo — Preto','Logo frente',60,130)`, [orcId])
  await db.query(`update configuracoes set loja_whatsapp = '(42) 99999-1111'`)
})

describe('link público', () => {
  it('quem tem o token vê o orçamento, os totais e os dados da loja — sem CPF/CNPJ do cliente', async () => {
    const o = await publico(token)
    expect(o).toBeTruthy()
    expect(o!.cliente).toBe('Mercado Bom')
    expect((o!.itens as unknown[]).length).toBe(1)
    expect(Number((o!.totais as Record<string, string>).total)).toBe(7800)
    expect((o!.totais as Record<string, boolean>).pede_sinal).toBe(true)
    expect((o!.loja as Record<string, string>).whatsapp).toBe('(42) 99999-1111')
    expect(JSON.stringify(o)).not.toContain('11222333000181')
    expect(JSON.stringify(o)).not.toContain('99999-0000')
  })

  it('token errado ou curto não devolve nada', async () => {
    expect(await publico('x'.repeat(64))).toBeNull()
    expect(await publico(token.slice(0, 10))).toBeNull()
    expect(await publico('')).toBeNull()
  })

  it('anônimo continua sem acesso às tabelas', async () => {
    const r = await comoAnonimo(() => db.query('select * from orcamentos'))
    expect(r.rows).toHaveLength(0)
    await expect(comoAnonimo(() => db.query(`update orcamentos set status = 'aprovado'`))).resolves.toBeTruthy()
    const st = await db.query<{ status: string }>(`select status from orcamentos`)
    expect(st.rows[0].status).toBe('rascunho') // RLS bloqueou o update direto
  })

  it('aprovar pelo link: grava quem aprovou; não aprova duas vezes', async () => {
    const o = await aprovar(token, 'Carlos Souza')
    expect(o.status).toBe('aprovado')
    const r = await db.query<{ aprovado_por: string; aprovado_em: string }>(`select aprovado_por, aprovado_em from orcamentos`)
    expect(r.rows[0].aprovado_por).toBe('Carlos Souza (pelo link)')
    expect(r.rows[0].aprovado_em).toBeTruthy()
    await expect(aprovar(token, 'Carlos')).rejects.toThrow(/já foi aprovado/)
  })

  it('não aprova sem nome, vencido ou recusado', async () => {
    await expect(aprovar(token, ' ')).rejects.toThrow(/nome/)
    await db.query(`update orcamentos set validade = '2020-01-01'`)
    expect((await publico(token))!.situacao).toBe('expirado')
    await expect(aprovar(token, 'Carlos')).rejects.toThrow(/venceu/)
    await db.query(`update orcamentos set validade = current_date + 3, status = 'recusado'`)
    await expect(aprovar(token, 'Carlos')).rejects.toThrow(/não está mais disponível/)
    await expect(aprovar('y'.repeat(64), 'Carlos')).rejects.toThrow(/não encontrado/)
  })

  it('registra a primeira visualização', async () => {
    await comoAnonimo(() => db.query(`select registrar_visualizacao($1)`, [token]))
    const a = (await db.query<{ v: string }>(`select visualizado_em::text as v from orcamentos`)).rows[0].v
    expect(a).toBeTruthy()
    await comoAnonimo(() => db.query(`select registrar_visualizacao($1)`, [token]))
    const b = (await db.query<{ v: string }>(`select visualizado_em::text as v from orcamentos`)).rows[0].v
    expect(b).toBe(a)
    const l = await db.query<{ visualizado_em: string }>(`select visualizado_em from orcamentos_lista`)
    expect(l.rows[0].visualizado_em).toBeTruthy()
  })
})

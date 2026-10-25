import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco, USUARIO } from './banco'

let db: PGlite
const inserir = (campos: Record<string, unknown>) => {
  const chaves = Object.keys(campos)
  return db.query(
    `insert into clientes (${chaves.join(',')}) values (${chaves.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
    Object.values(campos),
  )
}

beforeEach(async () => {
  db = await criarBanco()
})

describe('clientes', () => {
  it('cadastra PF e PJ (inclusive CNPJ alfanumérico)', async () => {
    await expect(inserir({ tipo: 'pf', nome: 'Maria', cpf_cnpj: '52998224725' })).resolves.toBeTruthy()
    await expect(inserir({ tipo: 'pj', nome: 'Empresa X LTDA', cpf_cnpj: '11222333000181' })).resolves.toBeTruthy()
    await expect(inserir({ tipo: 'pj', nome: 'Nova SA', cpf_cnpj: '12ABC34501DE35' })).resolves.toBeTruthy()
  })

  it('documento sem CPF/CNPJ é permitido', async () => {
    await expect(inserir({ tipo: 'pf', nome: 'Cliente balcão' })).resolves.toBeTruthy()
    await expect(inserir({ tipo: 'pf', nome: 'Outro balcão' })).resolves.toBeTruthy()
  })

  it('recusa formato errado de documento, CEP e UF', async () => {
    await expect(inserir({ tipo: 'pf', nome: 'A', cpf_cnpj: '11222333000181' })).rejects.toThrow()
    await expect(inserir({ tipo: 'pj', nome: 'B', cpf_cnpj: '52998224725' })).rejects.toThrow()
    await expect(inserir({ tipo: 'pf', nome: 'C', cep: '85200-000' })).rejects.toThrow()
    await expect(inserir({ tipo: 'pf', nome: 'D', uf: 'pr' })).rejects.toThrow()
    await expect(inserir({ tipo: 'pf', nome: '  ' })).rejects.toThrow()
  })

  it('não deixa repetir o mesmo CPF/CNPJ', async () => {
    await inserir({ tipo: 'pf', nome: 'Maria', cpf_cnpj: '52998224725' })
    await expect(inserir({ tipo: 'pf', nome: 'Maria de novo', cpf_cnpj: '52998224725' })).rejects.toThrow(/clientes_cpf_cnpj_unico/)
  })

  it('só logado vê e cria; autor fica registrado', async () => {
    await inserir({ tipo: 'pf', nome: 'Maria' })
    await db.exec('set role anon')
    expect((await db.query('select * from clientes')).rows).toHaveLength(0)
    await db.exec('reset role')
    const r = await comoUsuario(db, () => inserir({ tipo: 'pj', nome: 'Loja Y' }))
    expect((r.rows[0] as { created_by: string }).created_by).toBe(USUARIO)
  })
})

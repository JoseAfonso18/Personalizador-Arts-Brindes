import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { comoUsuario, criarBanco, USUARIO } from './banco'

let db: PGlite
let cliente: string
let pedido: string
let copo: string

beforeEach(async () => {
  db = await criarBanco()
  cliente = (await db.query<{ id: string }>(`insert into clientes (tipo, nome) values ('pj','Empresa X') returning id`)).rows[0].id
  copo = (await db.query<{ id: string }>(`insert into produtos (nome) values ('Copo') returning id`)).rows[0].id
  await db.query(`insert into faixas_preco (produto_id, qtd_min, qtd_max, preco) values ($1,1,null,150)`, [copo])
  const orc = (await db.query<{ id: string }>(`insert into orcamentos (cliente_id, observacao) values ($1,'Arte aprovada') returning id`, [cliente])).rows[0].id
  await db.query(`insert into orcamento_itens (orcamento_id, produto_id, descricao, detalhe, quantidade, preco_unitario, mockup) values ($1,$2,'Copo','Logo frente',10,120,'{"hash":"#p=zABC"}')`, [orc, copo])
  await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [orc])
  pedido = (await db.query<{ id: string }>(`select id from pedidos`)).rows[0].id
})

describe('anexos', () => {
  it('bucket privado criado; anexo pega o cliente do pedido e o autor', async () => {
    const b = await db.query<{ public: boolean }>(`select public from storage.buckets where id = 'anexos'`)
    expect(b.rows[0].public).toBe(false)
    const r = await comoUsuario(db, () =>
      db.query<{ cliente_id: string; created_by: string }>(`insert into anexos (pedido_id, nome, caminho, tipo, tamanho) values ($1,'logo.svg','pedidos/x/logo.svg','image/svg+xml',1234) returning cliente_id, created_by`, [pedido]),
    )
    expect(r.rows[0]).toEqual({ cliente_id: cliente, created_by: USUARIO })
  })

  it('anônimo não vê anexos; apagar o pedido apaga os anexos', async () => {
    await db.query(`insert into anexos (pedido_id, nome, caminho) values ($1,'a.png','p/a.png')`, [pedido])
    await db.exec('set role anon')
    expect((await db.query('select * from anexos')).rows).toHaveLength(0)
    await db.exec('reset role')
    await db.query(`delete from pedidos`)
    expect((await db.query('select * from anexos')).rows).toHaveLength(0)
  })
})

describe('repetir pedido', () => {
  it('cria orçamento novo com os mesmos itens, o que gravar e mockup, a preço atual', async () => {
    const novo = (await comoUsuario(db, () => db.query<{ id: string }>(`select repetir_pedido($1) as id`, [pedido]))).rows[0].id
    const o = (await db.query<{ cliente_id: string; status: string; repete_pedido_id: string; observacao: string }>(`select * from orcamentos where id = $1`, [novo])).rows[0]
    expect(o).toMatchObject({ cliente_id: cliente, status: 'rascunho', repete_pedido_id: pedido, observacao: 'Arte aprovada' })
    const i = (await db.query<{ detalhe: string; preco_unitario: string; mockup: { hash: string } }>(`select * from orcamento_itens where orcamento_id = $1`, [novo])).rows[0]
    expect(i.detalhe).toBe('Logo frente')
    expect(i.mockup.hash).toBe('#p=zABC')
    expect(Number(i.preco_unitario)).toBe(150) // preço da tabela hoje, não o antigo (120)
  })

  it('ao aprovar o orçamento repetido, o pedido novo já vem com os arquivos do anterior', async () => {
    await db.query(`insert into anexos (pedido_id, nome, caminho) values ($1,'logo.svg','pedidos/1/logo.svg'),($1,'arte.ezd','pedidos/1/arte.ezd')`, [pedido])
    const novo = (await db.query<{ id: string }>(`select repetir_pedido($1) as id`, [pedido])).rows[0].id
    await db.query(`update orcamentos set status = 'aprovado' where id = $1`, [novo])
    const p2 = (await db.query<{ id: string }>(`select id from pedidos where orcamento_id = $1`, [novo])).rows[0].id
    const a = await db.query<{ nome: string; caminho: string }>(`select nome, caminho from anexos where pedido_id = $1 order by nome`, [p2])
    expect(a.rows).toEqual([
      { nome: 'arte.ezd', caminho: 'pedidos/1/arte.ezd' },
      { nome: 'logo.svg', caminho: 'pedidos/1/logo.svg' },
    ])
  })

  it('venda sem cliente não pode ser repetida', async () => {
    await db.query(`update pedidos set cliente_id = null`)
    await expect(db.query(`select repetir_pedido($1)`, [pedido])).rejects.toThrow(/sem cliente/)
  })
})

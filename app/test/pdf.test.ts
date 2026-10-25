import { describe, expect, it } from 'vitest'
import { gerarPdfOrcamento, nomeArquivoPdf, type DadosPdf } from '@/lib/pdf'

const base = (n: number): DadosPdf => ({
  numero: 2,
  status: 'enviado',
  situacao: 'enviado',
  validade: '2030-11-01',
  prazo_entrega: '2030-11-20',
  observacao: 'Arte enviada pelo cliente.',
  aprovado_em: null,
  aprovado_por: null,
  frete_repassado: true,
  cliente: 'Mercado Bom Preço',
  cliente_detalhe: ['CNPJ 11.222.333/0001-81', 'Pitanga - PR'],
  itens: Array.from({ length: n }, (_, i) => ({
    descricao: `Copo Stanley 473 ml — Cor ${i + 1}`,
    detalhe: 'Logo na frente, nome atrás',
    quantidade: 10,
    preco_unitario: 130,
    adicional: 0,
    item_do_cliente: false,
    mockup: null,
  })),
  totais: { subtotal: n * 1300, desconto: 100, frete: 45, total: n * 1300 - 55, quantidade: n * 10, pede_sinal: true, sinal_percentual: 50, valor_sinal: 3222.5, valor_restante: 3222.5 },
  loja: {
    nome: "Art's Brindes",
    cnpj: '11222333000181',
    whatsapp: '(42) 99999-1111',
    telefone: null,
    email: null,
    instagram: 'artsbrindes',
    endereco: 'Rua XV, 100',
    cidade: 'Pitanga - PR',
    formas_pagamento: 'Pix, boleto ou cartão',
    texto_com_sinal: 'Entrada de {percentual} ({valor_sinal}). Restante {valor_restante} na entrega.',
    texto_sem_sinal: 'Pagamento na entrega.',
    validade_dias: 7,
  },
})

describe('PDF do orçamento', () => {
  it('5 itens cabem em 1 página A4 com totais, entrada e condições', () => {
    const doc = gerarPdfOrcamento(base(5), undefined, false)
    expect(doc.getNumberOfPages()).toBe(1)
    const txt = doc.output()
    expect(txt).toContain('ORC-0002')
    expect(txt).toContain('TOTAL')
    expect(txt).toContain('6.445,00')
    expect(txt).toContain('Entrada \\(50%\\)')
    expect(txt).toContain('CNPJ 11.222.333/0001-81')
  })

  it('muitos itens viram mais páginas, com rodapé "Página X de Y"', () => {
    const doc = gerarPdfOrcamento(base(40), undefined, false)
    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
    expect(doc.output()).toContain(`Página 1 de ${doc.getNumberOfPages()}`)
  })

  it('nome do arquivo sem acentos', () => {
    expect(nomeArquivoPdf({ numero: 2, cliente: 'Mercado Bom Preço Ltda.' })).toBe('Orcamento ORC-0002 - Mercado Bom Preco Ltda.pdf')
  })
})

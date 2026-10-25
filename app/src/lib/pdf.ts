import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { montarTexto } from '@/lib/condicoes'
import { formatarBRL } from '@/lib/dinheiro'
import { formatarData, numeroOrcamento } from '@/lib/orcamento'
import type { OrcamentoPublico } from '@/lib/publico'

/** Dados do PDF: os mesmos do link público + detalhes do cliente (só quando gerado pela loja). */
export type DadosPdf = OrcamentoPublico & { cliente_detalhe?: string[] }

const LARANJA: [number, number, number] = [250, 91, 4]
const CINZA: [number, number, number] = [66, 66, 66]
const CLARO: [number, number, number] = [115, 115, 115]
const LINHA: [number, number, number] = [229, 229, 229]

// Helvetica do PDF não tem alguns caracteres Unicode; troca pelos equivalentes
const limpar = (s: string) => s.replace(/−/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ')
const brl = (n: number) => limpar(formatarBRL(n))

export function nomeArquivoPdf(d: Pick<DadosPdf, 'numero' | 'cliente'>) {
  const cliente = d.cliente.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().slice(0, 40)
  return `Orcamento ${numeroOrcamento(d.numero)} - ${cliente}.pdf`
}

/** Monta o PDF A4 do orçamento. `logo` é a logo em PNG (data URL) — opcional. */
export function gerarPdfOrcamento(d: DadosPdf, logo?: { dataUrl: string; largura: number; altura: number }, comprimir = true): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: comprimir })
  const L = 15 // margem
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const D = W - L // borda direita
  const loja = d.loja
  const t = d.totais
  let y = L

  // Cabeçalho: logo à esquerda, dados da loja à direita
  if (logo) {
    const altura = 18
    doc.addImage(logo.dataUrl, 'JPEG', L, y, (logo.largura / logo.altura) * altura, altura)
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...LARANJA).text(limpar(loja?.nome ?? "Art's Brindes"), L, y + 10)
  }
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...CLARO)
  const contato = [
    loja?.nome,
    loja?.cnpj ? `CNPJ ${loja.cnpj.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\d{2})$/, '$1.$2.$3/$4-$5')}` : null,
    [loja?.whatsapp ? `WhatsApp ${loja.whatsapp}` : null, loja?.telefone].filter(Boolean).join(' · ') || null,
    [loja?.email, loja?.instagram ? `@${loja.instagram}` : null].filter(Boolean).join(' · ') || null,
    [loja?.endereco, loja?.cidade].filter(Boolean).join(' · ') || null,
  ].filter(Boolean) as string[]
  contato.forEach((linha, i) => {
    if (i === 0) doc.setFont('helvetica', 'bold').setTextColor(...CINZA)
    else doc.setFont('helvetica', 'normal').setTextColor(...CLARO)
    doc.text(limpar(linha), D, y + 3 + i * 4, { align: 'right' })
  })
  y += 24

  // Título
  doc.setDrawColor(...LARANJA).setLineWidth(0.8).line(L, y, D, y)
  y += 8
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...CINZA).text('ORÇAMENTO', L, y)
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...LARANJA).text(numeroOrcamento(d.numero), L + 38, y)
  doc.setFontSize(8.5).setTextColor(...CLARO)
  const datas = [`Emitido em ${formatarData(new Date().toISOString())}`, `Válido até ${formatarData(d.validade)}`, d.prazo_entrega ? `Entrega prevista ${formatarData(d.prazo_entrega)}` : null].filter(Boolean) as string[]
  doc.text(datas.join('   ·   '), D, y, { align: 'right' })
  y += 7

  // Cliente
  const detalhes = d.cliente_detalhe?.filter(Boolean) ?? []
  const altCliente = 10 + detalhes.length * 4
  doc.setFillColor(245, 245, 245).roundedRect(L, y, W - 2 * L, altCliente, 2, 2, 'F')
  doc.setFontSize(7.5).setTextColor(...CLARO).text('CLIENTE', L + 4, y + 5)
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...CINZA).text(limpar(d.cliente), L + 4, y + 10)
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...CLARO)
  detalhes.forEach((linha, i) => doc.text(limpar(linha), L + 4, y + 14.5 + i * 4))
  y += altCliente + 5

  // Itens
  autoTable(doc, {
    startY: y,
    margin: { left: L, right: L },
    head: [['#', 'Item', 'Qtd', 'Unitário', 'Total']],
    body: d.itens.map((i, n) => {
      const unit = i.preco_unitario + i.adicional
      const desc = limpar(i.descricao) + (i.detalhe ? `\n${limpar(i.detalhe)}` : '') + (i.item_do_cliente ? '\n(gravação em peça do cliente)' : '')
      return [String(n + 1), desc, String(i.quantidade), brl(unit), brl(unit * i.quantidade)]
    }),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, textColor: CINZA, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, valign: 'top' },
    headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: CLARO, fillColor: false as unknown as undefined },
    columnStyles: {
      0: { cellWidth: 8, textColor: CLARO },
      2: { cellWidth: 14, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (c) => {
      if (c.section === 'head' && c.column.index >= 2) c.cell.styles.halign = 'right'
    },
    didDrawCell: (c) => {
      if (c.section === 'body' || c.section === 'head') {
        doc.setDrawColor(...LINHA).setLineWidth(0.2).line(c.cell.x, c.cell.y + c.cell.height, c.cell.x + c.cell.width, c.cell.y + c.cell.height)
      }
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Totais (à direita)
  const novaPaginaSePreciso = (altura: number) => {
    if (y + altura > H - 18) {
      doc.addPage()
      y = L
    }
  }
  novaPaginaSePreciso(40)
  const xR = D
  const xL = W - L - 75
  const linhaTotal = (rotulo: string, valor: string, opts: { cor?: [number, number, number]; negrito?: boolean; tamanho?: number } = {}) => {
    doc.setFont('helvetica', opts.negrito ? 'bold' : 'normal').setFontSize(opts.tamanho ?? 9.5)
    doc.setTextColor(...CLARO).text(rotulo, xL, y)
    doc.setTextColor(...(opts.cor ?? CINZA)).text(valor, xR, y, { align: 'right' })
    y += (opts.tamanho ?? 9.5) * 0.55
  }
  linhaTotal(`Subtotal (${t.quantidade} un)`, brl(t.subtotal))
  if (t.desconto > 0) linhaTotal('Desconto', `- ${brl(t.desconto)}`, { cor: [22, 163, 74] })
  if (t.frete > 0 && d.frete_repassado) linhaTotal('Frete', brl(t.frete))
  y += 1
  doc.setDrawColor(...LINHA).setLineWidth(0.3).line(xL, y - 3, xR, y - 3)
  y += 2
  linhaTotal('TOTAL', brl(t.total), { negrito: true, tamanho: 14 })
  if (t.pede_sinal) {
    y += 1
    doc.setFillColor(255, 241, 230).roundedRect(xL - 3, y - 4.5, xR - xL + 6, 13, 2, 2, 'F')
    linhaTotal(`Entrada (${String(t.sinal_percentual).replace('.', ',')}%)`, brl(t.valor_sinal), { cor: [201, 68, 0], negrito: true })
    linhaTotal('Na entrega', brl(t.valor_restante))
  }
  y += 6

  // Condições e observação
  const blocoTexto = (titulo: string, texto: string) => {
    const linhas = doc.setFont('helvetica', 'normal').setFontSize(9).splitTextToSize(limpar(texto), W - 2 * L)
    novaPaginaSePreciso(8 + linhas.length * 4.2)
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...CLARO).text(titulo, L, y)
    y += 4.5
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...CINZA).text(linhas, L, y)
    y += linhas.length * 4.2 + 4
  }
  if (loja) {
    const condicoes = montarTexto(t.pede_sinal ? loja.texto_com_sinal : loja.texto_sem_sinal, {
      percentual: t.sinal_percentual,
      valor_sinal: t.valor_sinal,
      valor_restante: t.valor_restante,
      formas: loja.formas_pagamento,
      validade: loja.validade_dias,
    })
    blocoTexto('CONDIÇÕES DE PAGAMENTO', condicoes)
  }
  if (d.observacao) blocoTexto('OBSERVAÇÕES', d.observacao)
  if (d.situacao === 'aprovado' && d.aprovado_por) {
    blocoTexto('APROVAÇÃO', `Aprovado por ${d.aprovado_por.replace(' (pelo link)', '').replace(' (pela loja)', '')}${d.aprovado_em ? ` em ${formatarData(d.aprovado_em)}` : ''}.`)
  }

  // Rodapé em todas as páginas
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setDrawColor(...LINHA).setLineWidth(0.2).line(L, H - 12, D, H - 12)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...CLARO)
    doc.text(limpar(`${loja?.nome ?? "Art's Brindes"} · ${numeroOrcamento(d.numero)}`), L, H - 7.5)
    doc.text(`Página ${p} de ${paginas}`, D, H - 7.5, { align: 'right' })
  }
  return doc
}

/** Converte a logo SVG em imagem para pôr no PDF (só no navegador). */
export async function carregarLogoPng(src = '/brand/logo-claro.svg'): Promise<{ dataUrl: string; largura: number; altura: number } | undefined> {
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    // JPEG em fundo branco: fica nítido no A4 e o PDF continua leve para o WhatsApp
    const largura = 600
    const altura = Math.round((img.naturalHeight / img.naturalWidth) * largura) || 300
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, largura, altura)
    ctx.drawImage(img, 0, 0, largura, altura)
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), largura, altura }
  } catch {
    return undefined
  }
}

/** Gera e entrega o PDF: no celular abre o "compartilhar" (WhatsApp etc.); no PC baixa o arquivo. */
export async function baixarPdfOrcamento(d: DadosPdf) {
  const doc = gerarPdfOrcamento(d, await carregarLogoPng())
  const nome = nomeArquivoPdf(d)
  const arquivo = new File([doc.output('blob')], nome, { type: 'application/pdf' })
  const celular = window.matchMedia('(pointer: coarse)').matches
  if (celular && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  doc.save(nome)
}

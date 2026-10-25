import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Ban, Box, CheckCircle2, Copy, ExternalLink, Eye, FileDown, Link2, Loader2, MessageCircle, Plus, RefreshCw, RotateCcw, Send, Trash2, UserPlus, Wand2 } from 'lucide-react'
import { Seletor, type OpcaoSeletor } from '@/components/Seletor'
import { BotaoVer3D, Provador3DModal } from '@/components/Provador3D'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { listarClientes, salvarCliente, type Cliente } from '@/lib/clientes'
import { montarTexto } from '@/lib/condicoes'
import { lerConfiguracoes, type Configuracoes } from '@/lib/configuracoes'
import { formatarBRL, lerValor, valorParaCampo } from '@/lib/dinheiro'
import { formatarTelefone } from '@/lib/documento'
import { calcularTotais, formatarData, numeroOrcamento, precoSugerido } from '@/lib/orcamento'
import { buscarOrcamento, duplicarOrcamento, excluirOrcamento, mudarStatus, renovarOrcamento, salvarOrcamento, SITUACOES, type Orcamento, type Situacao, type StatusOrcamento } from '@/lib/orcamentos'
import { listarProdutos, type Produto } from '@/lib/produtos'
import { lerMockup, modeloDoProduto, textoInicial } from '@/lib/mockup'
import { pedidoDoOrcamento } from '@/lib/pedidos'
import { numeroPedido } from '@/lib/orcamento'
import { carregarPublico, linkOrcamento, linkWhatsApp } from '@/lib/publico'
import { formatarCNPJ, formatarCPF } from '@/lib/documento'
import { cn } from '@/lib/utils'

type ItemCampo = {
  chave: number
  produto_id: string | null
  variacao_id: string | null
  descricao: string
  detalhe: string
  quantidade: string
  preco: string
  precoManual: boolean
  adicional: string
  item_do_cliente: boolean
  mockup: unknown | null
}

let seq = 0
const chave = () => ++seq
const AVULSO = '__avulso__'

const itemVazio = (): ItemCampo => ({
  chave: chave(),
  produto_id: null,
  variacao_id: null,
  descricao: '',
  detalhe: '',
  quantidade: '1',
  preco: '',
  precoManual: false,
  adicional: '',
  item_do_cliente: false,
  mockup: null,
})

export function OrcamentoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()

  const [carregando, setCarregando] = useState(true)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cfg, setCfg] = useState<Configuracoes | null>(null)

  const [numero, setNumero] = useState<number | null>(null)
  const [status, setStatus] = useState<StatusOrcamento>('rascunho')
  const [aprovadoPor, setAprovadoPor] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [visualizado, setVisualizado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [pedido, setPedido] = useState<{ id: string; numero: number } | null>(null)
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [itens, setItens] = useState<ItemCampo[]>([itemVazio()])
  const [mockupDe, setMockupDe] = useState<number | null>(null)
  const [descTipo, setDescTipo] = useState<'valor' | 'percentual'>('valor')
  const [descValor, setDescValor] = useState('')
  const [descMotivo, setDescMotivo] = useState('')
  const [freteValor, setFreteValor] = useState('')
  const [freteRepassado, setFreteRepassado] = useState(true)
  const [sinalModo, setSinalModo] = useState<'auto' | 'forcar' | 'sem'>('auto')
  const [sinalPct, setSinalPct] = useState('')
  const [prazo, setPrazo] = useState('')
  const [validade, setValidade] = useState('')
  const [observacao, setObservacao] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [tentou, setTentou] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [novoCliente, setNovoCliente] = useState<{
    nome: string
    celular: string
    tipo: 'pf' | 'pj'
  } | null>(null)

  const somenteLeitura = status === 'aprovado'

  useEffect(() => {
    let vivo = true
    Promise.all([listarProdutos(), listarClientes(), lerConfiguracoes(), id ? buscarOrcamento(id) : Promise.resolve(null)])
      .then(([ps, cs, c, o]) => {
        if (!vivo) return
        setProdutos(ps)
        setClientes(cs)
        setCfg(c)
        if (id && !o) setErro('Orçamento não encontrado.')
        if (o) carregar(o)
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false))
    return () => {
      vivo = false
    }
  }, [id])

  function carregar(o: Orcamento) {
    setNumero(o.numero ?? null)
    setStatus(o.status ?? 'rascunho')
    setAprovadoPor(o.aprovado_por ?? null)
    setToken(o.token ?? null)
    if (o.status === 'aprovado' && o.id) void pedidoDoOrcamento(o.id).then(setPedido)
    setVisualizado(o.visualizado_em ?? null)
    setClienteId(o.cliente_id)
    setItens(
      o.itens.map((i) => ({
        chave: chave(),
        produto_id: i.produto_id,
        variacao_id: i.variacao_id,
        descricao: i.descricao,
        detalhe: i.detalhe ?? '',
        quantidade: String(i.quantidade),
        preco: valorParaCampo(i.preco_unitario),
        precoManual: true, // preço guardado no orçamento; "automático" recalcula pela tabela
        adicional: i.adicional ? valorParaCampo(i.adicional) : '',
        item_do_cliente: i.item_do_cliente,
        mockup: i.mockup,
      })),
    )
    setDescTipo(o.desconto_tipo)
    setDescValor(o.desconto_valor ? valorParaCampo(o.desconto_valor).replace(',00', '') : '')
    setDescMotivo(o.desconto_motivo ?? '')
    setFreteValor(o.frete_valor ? valorParaCampo(o.frete_valor) : '')
    setFreteRepassado(o.frete_repassado)
    setSinalModo(o.sinal_modo)
    setSinalPct(o.sinal_percentual != null ? String(o.sinal_percentual).replace('.', ',') : '')
    setPrazo(o.prazo_entrega ?? '')
    setValidade(o.validade ?? '')
    setObservacao(o.observacao ?? '')
  }

  const produtoPorId = useMemo(() => new Map(produtos.map((p) => [p.id!, p])), [produtos])

  // Quantidade total por produto (soma as cores) — usada para escolher a faixa
  const qtdPorProduto = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of itens) if (i.produto_id) m.set(i.produto_id, (m.get(i.produto_id) ?? 0) + (Number(i.quantidade) || 0))
    return m
  }, [itens])

  function sugerido(i: ItemCampo): number | null {
    const p = i.produto_id ? produtoPorId.get(i.produto_id) : undefined
    if (!p) return null
    const acr = p.variacoes.find((v) => v.id === i.variacao_id)?.acrescimo ?? 0
    return precoSugerido(p.faixas, qtdPorProduto.get(p.id!) ?? 0, acr)
  }
  const precoEfetivo = (i: ItemCampo) => (i.precoManual || !i.produto_id ? lerValor(i.preco) : sugerido(i))

  const regra = cfg ?? {
    sinal_percentual: 50,
    sinal_valor_minimo: null,
    sinal_qtd_minima: null,
  }
  const totais = calcularTotais(
    {
      itens: itens.map((i) => ({
        quantidade: Number(i.quantidade) || 0,
        preco_unitario: precoEfetivo(i) ?? 0,
        adicional: lerValor(i.adicional) ?? 0,
      })),
      desconto_tipo: descTipo,
      desconto_valor: lerValor(descValor) ?? 0,
      frete_valor: lerValor(freteValor) ?? 0,
      frete_repassado: freteRepassado,
      sinal_modo: sinalModo,
      sinal_percentual: sinalPct.trim() ? lerValor(sinalPct) : null,
    },
    regra,
  )
  const textoCondicoes = cfg
    ? montarTexto(totais.pede_sinal ? cfg.texto_com_sinal : cfg.texto_sem_sinal, {
        percentual: totais.sinal_percentual,
        valor_sinal: totais.valor_sinal,
        valor_restante: totais.valor_restante,
        formas: cfg.formas_pagamento,
        validade: cfg.validade_dias,
      })
    : ''

  const hoje = new Date().toISOString().slice(0, 10)
  const situacao: Situacao = (status === 'rascunho' || status === 'enviado') && validade && validade < hoje ? 'expirado' : status

  // Validação
  const erros: string[] = []
  if (!clienteId) erros.push('Escolha o cliente.')
  if (itens.length === 0) erros.push('Adicione pelo menos um item.')
  itens.forEach((i, n) => {
    const r = `Item ${n + 1}`
    if (!i.produto_id && !i.descricao.trim()) erros.push(`${r}: escolha um produto ou escreva a descrição.`)
    if (!(Number(i.quantidade) >= 1)) erros.push(`${r}: quantidade inválida.`)
    if (precoEfetivo(i) == null) erros.push(`${r}: sem preço${i.produto_id ? ' (nenhuma faixa cobre essa quantidade)' : ''}.`)
    const p = i.produto_id ? produtoPorId.get(i.produto_id) : undefined
    if (p && p.tipo === 'produto' && p.variacoes.length > 0 && !i.variacao_id) erros.push(`${r}: escolha a cor.`)
  })
  if ((lerValor(descValor) ?? 0) > 0 && !descMotivo.trim()) erros.push('Informe o motivo do desconto.')
  if (descTipo === 'percentual' && (lerValor(descValor) ?? 0) > 100) erros.push('Desconto acima de 100%.')

  function atualizarItem(k: number, mudancas: Partial<ItemCampo>) {
    setItens((xs) => xs.map((i) => (i.chave === k ? { ...i, ...mudancas } : i)))
  }

  function escolherProduto(k: number, valor: string) {
    if (valor === AVULSO)
      return atualizarItem(k, {
        produto_id: null,
        variacao_id: null,
        descricao: '',
        precoManual: true,
        item_do_cliente: false,
      })
    const p = produtoPorId.get(valor)
    if (!p) return
    const coresAtivas = p.variacoes.filter((v) => v.ativo)
    const unica = coresAtivas.length === 1 ? coresAtivas[0] : null
    atualizarItem(k, {
      produto_id: p.id!,
      variacao_id: unica?.id ?? null,
      descricao: unica ? `${p.nome} — ${unica.nome}` : p.nome,
      precoManual: false,
      item_do_cliente: p.tipo === 'servico_gravacao',
    })
  }

  function escolherCor(i: ItemCampo, variacaoId: string) {
    const p = i.produto_id ? produtoPorId.get(i.produto_id) : undefined
    const v = p?.variacoes.find((x) => x.id === variacaoId)
    atualizarItem(i.chave, {
      variacao_id: variacaoId || null,
      descricao: p ? (v ? `${p.nome} — ${v.nome}` : p.nome) : i.descricao,
    })
  }

  function montar(): Orcamento {
    return {
      id,
      cliente_id: clienteId!,
      validade: validade || null,
      prazo_entrega: prazo || null,
      desconto_tipo: descTipo,
      desconto_valor: lerValor(descValor) ?? 0,
      desconto_motivo: descMotivo.trim() || null,
      frete_valor: lerValor(freteValor) ?? 0,
      frete_repassado: freteRepassado,
      sinal_modo: sinalModo,
      sinal_percentual: sinalPct.trim() ? lerValor(sinalPct) : null,
      observacao: observacao.trim() || null,
      itens: itens.map((i) => ({
        produto_id: i.produto_id,
        variacao_id: i.variacao_id,
        descricao: i.descricao.trim() || (i.produto_id ? (produtoPorId.get(i.produto_id)?.nome ?? 'Item') : 'Item'),
        detalhe: i.detalhe.trim() || null,
        quantidade: Number(i.quantidade),
        preco_unitario: precoEfetivo(i) ?? 0,
        adicional: lerValor(i.adicional) ?? 0,
        item_do_cliente: i.item_do_cliente,
        mockup: i.mockup,
      })),
    }
  }

  async function salvar(e?: FormEvent) {
    e?.preventDefault()
    setTentou(true)
    if (erros.length) return null
    setSalvando(true)
    setErro(null)
    try {
      const novoId = await salvarOrcamento(montar())
      setAviso('Orçamento salvo.')
      if (!id) navigate(`/orcamentos/${novoId}`, { replace: true })
      else {
        const o = await buscarOrcamento(novoId)
        if (o) carregar(o)
      }
      return novoId
    } catch (err) {
      setErro((err as Error).message)
      return null
    } finally {
      setSalvando(false)
    }
  }

  async function acao(fn: () => Promise<unknown>, msg: string) {
    setSalvando(true)
    setErro(null)
    try {
      await fn()
      setAviso(msg)
      if (id) {
        const o = await buscarOrcamento(id)
        if (o) carregar(o)
      }
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  async function criarCliente() {
    if (!novoCliente?.nome.trim()) return
    try {
      const novo = await salvarCliente({
        tipo: novoCliente.tipo,
        nome: novoCliente.nome.trim(),
        nome_fantasia: null,
        cpf_cnpj: null,
        celular: novoCliente.celular || null,
        telefone: null,
        email: null,
        cep: null,
        logradouro: null,
        numero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        uf: null,
        confianca: false,
        observacao: null,
        ativo: true,
      })
      setClientes(await listarClientes())
      setClienteId(novo)
      setNovoCliente(null)
    } catch (err) {
      setErro((err as Error).message)
    }
  }

  const opcoesClientes: OpcaoSeletor[] = clientes
    .filter((c) => c.ativo || c.id === clienteId)
    .map((c) => ({
      valor: c.id!,
      rotulo: c.tipo === 'pj' && c.nome_fantasia ? c.nome_fantasia : c.nome,
      detalhe: [c.tipo === 'pj' && c.nome_fantasia ? c.nome : null, c.celular, c.cidade].filter(Boolean).join(' · '),
      busca: c.cpf_cnpj ?? '',
    }))
  const opcoesProdutos: OpcaoSeletor[] = [
    ...produtos
      .filter((p) => p.ativo)
      .map((p) => ({
        valor: p.id!,
        rotulo: p.nome,
        detalhe: p.tipo === 'servico_gravacao' ? 'Serviço de gravação (item do cliente)' : `${p.variacoes.length} cores`,
      })),
    {
      valor: AVULSO,
      rotulo: 'Item avulso (sem cadastro)',
      detalhe: 'Descrição e preço digitados à mão',
    },
  ]

  if (carregando)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )

  const s = SITUACOES[situacao]
  const cliente = clientes.find((c) => c.id === clienteId)
  const link = token ? linkOrcamento(token) : ''
  const nomeCliente = cliente ? (cliente.tipo === 'pj' && cliente.nome_fantasia ? cliente.nome_fantasia : cliente.nome.split(' ')[0]) : ''
  const mensagemWhats = numero
    ? `Olá${nomeCliente ? ` ${nomeCliente}` : ''}! Segue o orçamento ${numeroOrcamento(numero)} da ${cfg?.loja_nome ?? "Art's Brindes"}: ${formatarBRL(totais.total)}.${totais.pede_sinal ? ` Entrada de ${formatarBRL(totais.valor_sinal)}.` : ''}\n\nVeja os detalhes e aprove por aqui: ${link}`
    : ''

  async function marcarEnviado() {
    if (id && status === 'rascunho') {
      await mudarStatus(id, 'enviado')
      setStatus('enviado')
    }
  }
  async function baixarPdf() {
    if (!token) return
    setGerandoPdf(true)
    setErro(null)
    try {
      const dados = await carregarPublico(token)
      if (!dados) throw new Error('Salve o orçamento antes de gerar o PDF.')
      const doc = cliente?.cpf_cnpj ? (cliente.tipo === 'pj' ? `CNPJ ${formatarCNPJ(cliente.cpf_cnpj)}` : `CPF ${formatarCPF(cliente.cpf_cnpj)}`) : null
      const endereco = [
        cliente?.logradouro && `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ''}`,
        cliente?.bairro,
        cliente?.cidade && `${cliente.cidade}${cliente.uf ? ` - ${cliente.uf}` : ''}`,
      ]
        .filter(Boolean)
        .join(' · ')
      const detalhe = [cliente?.tipo === 'pj' && cliente.nome_fantasia ? cliente.nome : null, doc, endereco || null, cliente?.celular || cliente?.telefone || null].filter(Boolean) as string[]
      const { baixarPdfOrcamento } = await import('@/lib/pdf')
      await baixarPdfOrcamento({ ...dados, cliente_detalhe: detalhe })
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setGerandoPdf(false)
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      window.prompt('Copie o link:', link)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
    await marcarEnviado()
  }

  return (
    <form onSubmit={salvar} className="mx-auto max-w-6xl space-y-5 pb-40 md:pb-0">
      {(() => {
        const it = itens.find((x) => x.chave === mockupDe)
        if (!it) return null
        const p = it.produto_id ? produtoPorId.get(it.produto_id) : undefined
        const cor = p?.variacoes.find((v) => v.id === it.variacao_id)?.nome
        return (
          <Provador3DModal
            titulo={it.descricao || p?.nome || 'Item'}
            produto={modeloDoProduto(p?.nome ?? it.descricao)}
            cor={cor}
            texto={textoInicial(it.detalhe)}
            mockup={lerMockup(it.mockup)}
            onFechar={() => setMockupDe(null)}
            onSalvar={(m) => {
              atualizarItem(it.chave, { mockup: m })
              setMockupDe(null)
            }}
          />
        )
      })()}
      <header className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/orcamentos" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          {numero && <p className="text-muted-foreground font-mono text-xs">{numeroOrcamento(numero)}</p>}
          <h1 className="titulo-pagina">{id ? 'Orçamento' : 'Novo orçamento'}</h1>
        </div>
        {id && <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', s.classe)}>{s.texto}</span>}
      </header>

      {somenteLeitura && (
        <p className="bg-success-soft text-success rounded-xl px-4 py-3 text-sm">
          Aprovado{aprovadoPor ? ` por ${aprovadoPor}` : ''}. Para mudar algo, use <b>Duplicar</b> e faça um novo orçamento.
          {pedido && (
            <Link to={`/pedidos/${pedido.id}`} className="mt-1 block font-semibold underline">
              Ver pedido {numeroPedido(pedido.numero)} →
            </Link>
          )}
        </p>
      )}
      {situacao === 'expirado' && (
        <p className="bg-warning-soft text-warning flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm">
          Este orçamento venceu em {formatarData(validade)}. Renove para atualizar os preços e a validade.
          <Button type="button" size="sm" variant="outline" className="ml-auto" disabled={salvando} onClick={() => acao(() => renovarOrcamento(id!), 'Orçamento renovado com os preços atuais.')}>
            <RefreshCw /> Renovar
          </Button>
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <fieldset disabled={somenteLeitura} className="min-w-0 space-y-5">
          {/* Cliente */}
          <Card>
            <Campo label="Cliente" htmlFor="cliente">
              <Seletor
                id="cliente"
                opcoes={opcoesClientes}
                valor={clienteId}
                onChange={setClienteId}
                placeholder="Escolher cliente…"
                vazio="Nenhum cliente com esse nome"
                rodape={(fechar, termo) => (
                  <button
                    type="button"
                    onClick={() => {
                      setNovoCliente({ nome: termo, celular: '', tipo: 'pj' })
                      fechar()
                    }}
                    className="hover:bg-accent text-primary-strong flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                  >
                    <UserPlus className="size-4" /> Cadastrar novo cliente
                    {termo ? ` "${termo}"` : ''}
                  </button>
                )}
              />
            </Campo>
            {novoCliente && (
              <div className="bg-muted/50 space-y-3 rounded-xl border p-3">
                <p className="text-sm font-medium">Novo cliente rápido</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['pj', 'pf'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setNovoCliente({ ...novoCliente, tipo: t })}
                      className={cn('rounded-lg border px-3 py-2 text-sm', novoCliente.tipo === t ? 'border-primary bg-primary-soft text-primary-strong' : 'bg-card')}
                    >
                      {t === 'pj' ? 'Empresa' : 'Pessoa'}
                    </button>
                  ))}
                </div>
                <Input placeholder="Nome" value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })} />
                <Input
                  placeholder="Celular / WhatsApp"
                  inputMode="tel"
                  value={novoCliente.celular}
                  onChange={(e) =>
                    setNovoCliente({
                      ...novoCliente,
                      celular: formatarTelefone(e.target.value),
                    })
                  }
                />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setNovoCliente(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="flex-1" onClick={criarCliente} disabled={!novoCliente.nome.trim()}>
                    Cadastrar e usar
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">Depois dá para completar CNPJ e endereço em Clientes.</p>
              </div>
            )}
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
              <CardDescription>O preço sai da faixa pela quantidade total do produto (somando as cores). Dá para mudar à mão.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {itens.map((i, n) => {
                const p = i.produto_id ? produtoPorId.get(i.produto_id) : undefined
                const sug = sugerido(i)
                const efetivo = precoEfetivo(i)
                const qtd = Number(i.quantidade) || 0
                const totalProduto = i.produto_id ? (qtdPorProduto.get(i.produto_id) ?? 0) : 0
                const avulso = !i.produto_id && (i.descricao !== '' || i.precoManual)
                return (
                  <div key={i.chave} className="bg-muted/40 space-y-3 rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-card text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full border text-xs">{n + 1}</span>
                      <div className="min-w-0 flex-1">
                        <Seletor opcoes={opcoesProdutos} valor={i.produto_id ?? (avulso ? AVULSO : null)} onChange={(v) => escolherProduto(i.chave, v)} placeholder="Escolher produto…" />
                      </div>
                      {!somenteLeitura && (
                        <Button type="button" variant="ghost" size="icon" aria-label="Remover item" onClick={() => setItens((xs) => xs.filter((x) => x.chave !== i.chave))}>
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      )}
                    </div>

                    {!i.produto_id && avulso && <Input placeholder="Descrição do item" value={i.descricao} onChange={(e) => atualizarItem(i.chave, { descricao: e.target.value })} />}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_0.8fr_1.1fr_1fr]">
                      {p && p.tipo === 'produto' && p.variacoes.length > 0 ? (
                        <Campo label="Cor" htmlFor={`cor-${i.chave}`} className="col-span-2 sm:col-span-1">
                          <select
                            id={`cor-${i.chave}`}
                            value={i.variacao_id ?? ''}
                            onChange={(e) => escolherCor(i, e.target.value)}
                            className="border-input bg-card h-10 w-full rounded-md border px-2 text-base outline-none md:h-9 md:text-sm"
                          >
                            <option value="">Escolher cor…</option>
                            {p.variacoes
                              .filter((v) => v.ativo || v.id === i.variacao_id)
                              .map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.nome}
                                  {v.acrescimo ? ` (+${formatarBRL(v.acrescimo)})` : ''} · {v.estoque} em estoque
                                </option>
                              ))}
                          </select>
                        </Campo>
                      ) : (
                        <div className="hidden sm:block" />
                      )}
                      <Campo label="Qtd" htmlFor={`qtd-${i.chave}`}>
                        <Input
                          id={`qtd-${i.chave}`}
                          inputMode="numeric"
                          value={i.quantidade}
                          onChange={(e) =>
                            atualizarItem(i.chave, {
                              quantidade: e.target.value.replace(/\D/g, ''),
                            })
                          }
                        />
                      </Campo>
                      <Campo label="Preço unit." htmlFor={`preco-${i.chave}`}>
                        <div className="relative">
                          <Input
                            id={`preco-${i.chave}`}
                            inputMode="decimal"
                            className="pr-8"
                            placeholder={sug != null ? valorParaCampo(sug) : '0,00'}
                            value={i.precoManual || !i.produto_id ? i.preco : sug != null ? valorParaCampo(sug) : ''}
                            onChange={(e) =>
                              atualizarItem(i.chave, {
                                preco: e.target.value,
                                precoManual: true,
                              })
                            }
                          />
                          {i.produto_id && i.precoManual && !somenteLeitura && (
                            <button
                              type="button"
                              title="Voltar ao preço da tabela"
                              onClick={() =>
                                atualizarItem(i.chave, {
                                  precoManual: false,
                                  preco: '',
                                })
                              }
                              className="text-muted-foreground hover:text-primary absolute top-1/2 right-2 -translate-y-1/2"
                            >
                              <Wand2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </Campo>
                      <Campo label="Total" htmlFor={`tot-${i.chave}`}>
                        <p id={`tot-${i.chave}`} className="flex h-10 items-center font-semibold md:h-9">
                          {efetivo != null ? formatarBRL(qtd * (efetivo + (lerValor(i.adicional) ?? 0))) : '—'}
                        </p>
                      </Campo>
                    </div>

                    {p && !i.precoManual && sug != null && totalProduto !== qtd && (
                      <p className="text-muted-foreground text-xs">
                        Faixa pela quantidade total de {p.nome}: {totalProduto} un.
                      </p>
                    )}
                    {i.produto_id && i.precoManual && sug != null && efetivo !== sug && <p className="text-warning text-xs">Preço digitado à mão (tabela: {formatarBRL(sug)}).</p>}

                    <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                      <Textarea
                        rows={2}
                        placeholder="O que gravar: nome, logo, frase, posição…"
                        value={i.detalhe}
                        onChange={(e) => atualizarItem(i.chave, { detalhe: e.target.value })}
                        className="min-h-0"
                      />
                      <Campo label="Adicional / un (opcional)" htmlFor={`adic-${i.chave}`}>
                        <Input
                          id={`adic-${i.chave}`}
                          inputMode="decimal"
                          placeholder="ex.: 2ª face"
                          value={i.adicional}
                          onChange={(e) =>
                            atualizarItem(i.chave, {
                              adicional: e.target.value,
                            })
                          }
                        />
                      </Campo>
                    </div>
                    {i.item_do_cliente && <p className="text-muted-foreground text-xs">Item trazido pelo cliente (não mexe no estoque).</p>}
                    <ItemMockup mockup={i.mockup} somenteLeitura={somenteLeitura} onMontar={() => setMockupDe(i.chave)} onRemover={() => atualizarItem(i.chave, { mockup: null })} />
                  </div>
                )
              })}
              {!somenteLeitura && (
                <Button type="button" variant="outline" onClick={() => setItens((xs) => [...xs, itemVazio()])}>
                  <Plus /> Item
                </Button>
              )}
            </div>
          </Card>

          {/* Desconto, frete, sinal, datas */}
          <Card>
            <CardHeader>
              <CardTitle>Condições</CardTitle>
            </CardHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="desc">Desconto</Label>
                <div className="flex gap-2">
                  <div className="bg-muted grid shrink-0 grid-cols-2 rounded-lg p-1">
                    {(['valor', 'percentual'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDescTipo(t)}
                        className={cn('rounded-md px-2.5 text-sm', descTipo === t ? 'bg-card shadow-subtle border font-medium' : 'text-muted-foreground')}
                      >
                        {t === 'valor' ? 'R$' : '%'}
                      </button>
                    ))}
                  </div>
                  <Input id="desc" inputMode="decimal" placeholder="0" value={descValor} onChange={(e) => setDescValor(e.target.value)} />
                </div>
                {(lerValor(descValor) ?? 0) > 0 && (
                  <Input
                    placeholder="Motivo do desconto (obrigatório)"
                    value={descMotivo}
                    onChange={(e) => setDescMotivo(e.target.value)}
                    className={cn(tentou && !descMotivo.trim() && 'border-destructive')}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="frete">Frete</Label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
                  <Input id="frete" inputMode="decimal" className="pl-9" placeholder="0,00" value={freteValor} onChange={(e) => setFreteValor(e.target.value)} />
                </div>
                {(lerValor(freteValor) ?? 0) > 0 && (
                  <div className="bg-muted grid grid-cols-2 rounded-lg p-1 text-sm">
                    {[true, false].map((r) => (
                      <button
                        key={String(r)}
                        type="button"
                        onClick={() => setFreteRepassado(r)}
                        className={cn('rounded-md py-1', freteRepassado === r ? 'bg-card shadow-subtle border font-medium' : 'text-muted-foreground')}
                      >
                        {r ? 'Cliente paga' : 'Loja paga'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sinal</Label>
                <div className="bg-muted grid grid-cols-3 rounded-lg p-1 text-sm">
                  {(
                    [
                      ['auto', 'Automático'],
                      ['forcar', 'Pedir'],
                      ['sem', 'Sem sinal'],
                    ] as const
                  ).map(([m, t]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSinalModo(m)}
                      className={cn('rounded-md py-1', sinalModo === m ? 'bg-card shadow-subtle border font-medium' : 'text-muted-foreground')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {sinalModo !== 'sem' && (
                  <div className="relative">
                    <Input
                      aria-label="Percentual do sinal"
                      inputMode="decimal"
                      className="pr-10"
                      placeholder={`${cfg?.sinal_percentual ?? 50} (padrão)`}
                      value={sinalPct}
                      onChange={(e) => setSinalPct(e.target.value)}
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">%</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Prazo de entrega" htmlFor="prazo">
                  <Input id="prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
                </Campo>
                <Campo label="Válido até" htmlFor="validade">
                  <Input id="validade" type="date" value={validade} placeholder="automático" onChange={(e) => setValidade(e.target.value)} />
                </Campo>
              </div>
            </div>
            <Campo label="Observação (aparece no orçamento)" htmlFor="obs">
              <Textarea id="obs" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </Campo>
          </Card>
        </fieldset>

        {/* Resumo */}
        <div className="space-y-3 lg:sticky lg:top-6">
          <Card className="gap-3">
            <CardTitle>Resumo</CardTitle>
            <Linha rotulo={`Subtotal (${totais.quantidade} un)`} valor={formatarBRL(totais.subtotal)} />
            {totais.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarBRL(totais.desconto)}`} classe="text-success" />}
            {totais.frete > 0 && <Linha rotulo={freteRepassado ? 'Frete' : 'Frete (loja paga)'} valor={freteRepassado ? formatarBRL(totais.frete) : '—'} />}
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-semibold tracking-tight">{formatarBRL(totais.total)}</span>
            </div>
            {totais.pede_sinal ? (
              <div className="bg-primary-soft space-y-1 rounded-lg p-3 text-sm">
                <Linha rotulo={`Sinal (${String(totais.sinal_percentual).replace('.', ',')}%)`} valor={formatarBRL(totais.valor_sinal)} classe="text-primary-strong font-semibold" />
                <Linha rotulo="Na entrega" valor={formatarBRL(totais.valor_restante)} />
              </div>
            ) : (
              <p className="bg-muted text-muted-foreground rounded-lg p-3 text-sm">Sem sinal — pagamento na entrega.</p>
            )}
            {textoCondicoes && <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">{textoCondicoes}</p>}
          </Card>

          {id && token && situacao !== 'recusado' && (
            <Card className="gap-3">
              <CardTitle className="flex items-center gap-2">
                <Link2 className="text-primary size-4" /> Enviar para o cliente
              </CardTitle>
              {situacao === 'expirado' ? (
                <p className="text-muted-foreground text-sm">Renove o orçamento antes de enviar.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={copiarLink}>
                      {copiado ? <CheckCircle2 className="text-success" /> : <Copy />} {copiado ? 'Copiado' : 'Copiar link'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href={linkWhatsApp(cliente?.celular || cliente?.telefone, mensagemWhats)} target="_blank" rel="noreferrer" onClick={() => void marcarEnviado()}>
                        <MessageCircle /> WhatsApp
                      </a>
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={baixarPdf} disabled={gerandoPdf}>
                    {gerandoPdf ? <Loader2 className="animate-spin" /> : <FileDown />} PDF
                  </Button>
                  <a href={link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
                    <ExternalLink className="size-3" /> Ver como o cliente vê
                  </a>
                  {!cliente?.celular && !cliente?.telefone && <p className="text-muted-foreground text-xs">Cliente sem celular cadastrado: o WhatsApp abre para você escolher o contato.</p>}
                </>
              )}
              {visualizado && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Eye className="size-3" /> Cliente abriu o link em {formatarData(visualizado)}
                </p>
              )}
            </Card>
          )}

          {tentou && erros.length > 0 && (
            <ul className="text-destructive space-y-1 text-sm">
              {erros.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}
          {erro && <p className="text-destructive text-sm">{erro}</p>}
          {aviso && !erro && (
            <p className="text-success flex items-center gap-1 text-sm">
              <CheckCircle2 className="size-4" /> {aviso}
            </p>
          )}

          {/* Ações */}
          <div className="bg-background/95 fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-10 space-y-2 border-t p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
            {!somenteLeitura && (
              <Button type="submit" size="lg" className="w-full" disabled={salvando}>
                {salvando && <Loader2 className="animate-spin" />} Salvar
              </Button>
            )}
            {id && (
              <div className="grid grid-cols-2 gap-2">
                {!somenteLeitura && situacao !== 'recusado' && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={salvando}
                    onClick={async () => {
                      const ok = await salvar()
                      if (ok) await acao(() => mudarStatus(id, 'aprovado', `${perfil?.nome ?? 'Loja'} (pela loja)`), 'Orçamento aprovado.')
                    }}
                  >
                    <CheckCircle2 /> Aprovar
                  </Button>
                )}
                {status === 'rascunho' && situacao !== 'expirado' && (
                  <Button type="button" variant="outline" disabled={salvando} onClick={() => acao(() => mudarStatus(id, 'enviado'), 'Marcado como enviado ao cliente.')}>
                    <Send /> Enviado
                  </Button>
                )}
                {status === 'enviado' && (
                  <Button type="button" variant="outline" disabled={salvando} onClick={() => acao(() => mudarStatus(id, 'recusado'), 'Marcado como recusado.')}>
                    <Ban /> Recusado
                  </Button>
                )}
                {status === 'recusado' && (
                  <Button type="button" variant="outline" disabled={salvando} onClick={() => acao(() => renovarOrcamento(id), 'Orçamento reaberto com preços atuais.')}>
                    <RotateCcw /> Reabrir
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={salvando}
                  onClick={async () => {
                    setSalvando(true)
                    try {
                      const novo = await duplicarOrcamento(id)
                      navigate(`/orcamentos/${novo}`)
                    } catch (err) {
                      setErro((err as Error).message)
                    } finally {
                      setSalvando(false)
                    }
                  }}
                >
                  <Copy /> Duplicar
                </Button>
                {!somenteLeitura &&
                  (confirmarExclusao ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={salvando}
                      onClick={async () => {
                        await excluirOrcamento(id)
                        navigate('/orcamentos')
                      }}
                    >
                      Confirmar
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => setConfirmarExclusao(true)}>
                      <Trash2 /> Excluir
                    </Button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

function Campo({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-muted-foreground text-xs">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className={classe}>{valor}</span>
    </div>
  )
}

function ItemMockup({ mockup, somenteLeitura, onMontar, onRemover }: { mockup: unknown; somenteLeitura: boolean; onMontar: () => void; onRemover: () => void }) {
  const m = lerMockup(mockup)
  if (somenteLeitura) return m ? <BotaoVer3D mockup={m} /> : null
  if (!m)
    return (
      <Button type="button" variant="outline" size="sm" onClick={onMontar}>
        <Box /> Montar mockup 3D
      </Button>
    )
  return (
    <div className="bg-card flex flex-wrap items-center gap-2 rounded-lg border p-2">
      <Box className="text-primary size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">Mockup 3D pronto</p>
        <p className="text-muted-foreground truncate text-xs">
          {m.titulo}
          {m.desc ? ` · ${m.desc}` : ''}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onMontar}>
        Ajustar
      </Button>
      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onRemover}>
        Tirar
      </Button>
    </div>
  )
}

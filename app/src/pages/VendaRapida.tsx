import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, CheckCircle2, Loader2, Minus, Plus, ShieldCheck, Trash2, Zap } from 'lucide-react'
import { Seletor, type OpcaoSeletor } from '@/components/Seletor'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { listarClientes, type Cliente } from '@/lib/clientes'
import { formatarBRL, lerValor, valorParaCampo } from '@/lib/dinheiro'
import { hojeISO, numeroPedido, precoSugerido } from '@/lib/orcamento'
import { FORMAS, type FormaPagamento } from '@/lib/pedidos'
import { listarProdutos, type Produto } from '@/lib/produtos'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Linha = { chave: number; produto_id: string; variacao_id: string | null; quantidade: number; preco: string; precoManual: boolean; detalhe: string }
type Forma = FormaPagamento | 'fiado'
let seq = 0

export function VendaRapida() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [forma, setForma] = useState<Forma>('pix')
  const [recebido, setRecebido] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [desconto, setDesconto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [entregue, setEntregue] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState<{ id: string; numero: number; total: number; troco: number } | null>(null)

  useEffect(() => {
    Promise.all([listarProdutos(), listarClientes()])
      .then(([ps, cs]) => {
        setProdutos(ps.filter((p) => p.ativo))
        setClientes(cs.filter((c) => c.ativo))
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [])

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id!, p])), [produtos])
  const qtdPorProduto = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of linhas) m.set(l.produto_id, (m.get(l.produto_id) ?? 0) + l.quantidade)
    return m
  }, [linhas])

  const preco = (l: Linha) => {
    if (l.precoManual) return lerValor(l.preco)
    const p = porId.get(l.produto_id)
    if (!p) return null
    return precoSugerido(p.faixas, qtdPorProduto.get(l.produto_id) ?? 0, p.variacoes.find((v) => v.id === l.variacao_id)?.acrescimo ?? 0)
  }

  const subtotal = linhas.reduce((s, l) => s + l.quantidade * (preco(l) ?? 0), 0)
  const valorDesconto = Math.min(subtotal, lerValor(desconto) ?? 0)
  const total = Math.round((subtotal - valorDesconto) * 100) / 100
  const troco = forma === 'dinheiro' && lerValor(recebido) != null ? Math.round(((lerValor(recebido) ?? 0) - total) * 100) / 100 : null
  const cliente = clientes.find((c) => c.id === clienteId)

  function adicionar(produtoId: string) {
    const p = porId.get(produtoId)
    if (!p) return
    const cores = p.variacoes.filter((v) => v.ativo)
    setLinhas((ls) => [...ls, { chave: ++seq, produto_id: produtoId, variacao_id: cores.length === 1 ? cores[0].id! : null, quantidade: 1, preco: '', precoManual: false, detalhe: '' }])
  }
  const mudar = (k: number, m: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.chave === k ? { ...l, ...m } : l)))

  const erros: string[] = []
  if (!linhas.length) erros.push('Adicione um item.')
  linhas.forEach((l, i) => {
    const p = porId.get(l.produto_id)
    if (p && p.tipo === 'produto' && p.variacoes.length > 0 && !l.variacao_id) erros.push(`Item ${i + 1}: escolha a cor.`)
    if (preco(l) == null) erros.push(`Item ${i + 1}: sem preço.`)
  })
  if (valorDesconto > 0 && !motivo.trim()) erros.push('Informe o motivo do desconto.')
  if (forma === 'fiado' && !cliente?.confianca) erros.push('Fiado só para cliente de confiança.')
  if (forma === 'fiado' && !vencimento) erros.push('Escolha quando o cliente vai pagar.')
  if (troco != null && troco < 0) erros.push('Valor recebido menor que o total.')

  async function finalizar() {
    if (erros.length) return
    setSalvando(true)
    setErro(null)
    try {
      const itens = linhas.map((l) => {
        const p = porId.get(l.produto_id)!
        const v = p.variacoes.find((x) => x.id === l.variacao_id)
        return {
          produto_id: p.id,
          variacao_id: l.variacao_id,
          descricao: v ? `${p.nome} — ${v.nome}` : p.nome,
          detalhe: l.detalhe.trim() || null,
          quantidade: l.quantidade,
          preco_unitario: preco(l),
          item_do_cliente: p.tipo === 'servico_gravacao',
        }
      })
      const { data, error } = await supabase.rpc('venda_rapida', {
        p: { cliente_id: clienteId, itens, desconto: valorDesconto, desconto_motivo: motivo.trim() || null, forma, vencimento: forma === 'fiado' ? vencimento : null, entregue },
      })
      if (error) throw new Error(error.message)
      const { data: ped } = await supabase.from('pedidos').select('numero').eq('id', data as string).single()
      setFeito({ id: data as string, numero: (ped as { numero: number }).numero, total, troco: troco ?? 0 })
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  function novaVenda() {
    setLinhas([])
    setClienteId(null)
    setForma('pix')
    setRecebido('')
    setVencimento('')
    setDesconto('')
    setMotivo('')
    setEntregue(true)
    setFeito(null)
  }

  if (carregando)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )

  if (feito)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        <span className="bg-success-soft text-success grid size-16 place-items-center rounded-full">
          <CheckCircle2 className="size-8" />
        </span>
        <div>
          <p className="text-muted-foreground font-mono text-xs">{numeroPedido(feito.numero)}</p>
          <h1 className="titulo-pagina">Venda registrada</h1>
          <p className="text-muted-foreground">{formatarBRL(feito.total)}{forma === 'fiado' ? ' no fiado' : ` · ${FORMAS[forma as FormaPagamento]}`}</p>
        </div>
        {feito.troco > 0 && (
          <p className="bg-primary-soft text-primary-strong rounded-xl px-4 py-3 text-lg font-semibold">Troco: {formatarBRL(feito.troco)}</p>
        )}
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => navigate(`/pedidos/${feito.id}`)}>
            Ver pedido
          </Button>
          <Button onClick={novaVenda}>
            <Zap /> Nova venda
          </Button>
        </div>
      </div>
    )

  const opcoesProdutos: OpcaoSeletor[] = produtos.map((p) => ({ valor: p.id!, rotulo: p.nome, detalhe: p.tipo === 'servico_gravacao' ? 'Gravação em peça do cliente' : `${p.variacoes.length} cores` }))
  const opcoesClientes: OpcaoSeletor[] = clientes.map((c) => ({ valor: c.id!, rotulo: c.tipo === 'pj' && c.nome_fantasia ? c.nome_fantasia : c.nome, detalhe: [c.celular, c.confianca ? 'de confiança' : null].filter(Boolean).join(' · ') }))

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-44 md:pb-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/pedidos" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="titulo-pagina flex items-center gap-2">
          <Zap className="text-primary size-6" /> Venda rápida
        </h1>
      </header>

      {/* Itens */}
      <Card className="gap-3">
        <Seletor opcoes={opcoesProdutos} valor={null} onChange={adicionar} placeholder="+ Adicionar produto…" />
        {linhas.length === 0 && <p className="text-muted-foreground py-4 text-center text-sm">Escolha o que o cliente está levando.</p>}
        {linhas.map((l) => {
          const p = porId.get(l.produto_id)!
          const unit = preco(l)
          return (
            <div key={l.chave} className="bg-muted/40 space-y-2 rounded-xl border p-3">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium">{p.nome}</p>
                <button onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                  <Trash2 className="size-4" />
                </button>
              </div>
              {p.tipo === 'produto' && p.variacoes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.variacoes
                    .filter((v) => v.ativo)
                    .map((v) => (
                      <button
                        key={v.id}
                        onClick={() => mudar(l.chave, { variacao_id: v.id! })}
                        className={cn('rounded-full border px-2.5 py-1 text-xs', l.variacao_id === v.id ? 'border-primary bg-primary-soft text-primary-strong font-medium' : 'bg-card')}
                      >
                        {v.nome}
                        <span className="text-muted-foreground"> · {v.estoque}</span>
                      </button>
                    ))}
                </div>
              )}
              {p.tipo === 'servico_gravacao' && (
                <Input placeholder="O que gravar (ex.: nome na garrafa)" value={l.detalhe} onChange={(e) => mudar(l.chave, { detalhe: e.target.value })} />
              )}
              <div className="flex items-center gap-2">
                <div className="bg-card flex items-center rounded-lg border">
                  <button className="p-2" aria-label="Menos" onClick={() => mudar(l.chave, { quantidade: Math.max(1, l.quantidade - 1) })}>
                    <Minus className="size-4" />
                  </button>
                  <input
                    aria-label="Quantidade"
                    inputMode="numeric"
                    className="w-10 bg-transparent text-center text-sm font-semibold outline-none"
                    value={l.quantidade}
                    onChange={(e) => mudar(l.chave, { quantidade: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1) })}
                  />
                  <button className="p-2" aria-label="Mais" onClick={() => mudar(l.chave, { quantidade: l.quantidade + 1 })}>
                    <Plus className="size-4" />
                  </button>
                </div>
                <span className="text-muted-foreground text-xs">×</span>
                <div className="relative w-32">
                  <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">R$</span>
                  <Input
                    aria-label="Preço"
                    inputMode="decimal"
                    className="pl-8"
                    value={l.precoManual ? l.preco : unit != null ? valorParaCampo(unit) : ''}
                    onChange={(e) => mudar(l.chave, { preco: e.target.value, precoManual: true })}
                  />
                </div>
                <span className="ml-auto text-sm font-semibold">{unit != null ? formatarBRL(unit * l.quantidade) : '—'}</span>
              </div>
            </div>
          )
        })}
      </Card>

      {/* Cliente e entrega */}
      <Card className="gap-3">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">Cliente (opcional)</p>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Seletor opcoes={opcoesClientes} valor={clienteId} onChange={setClienteId} placeholder="Consumidor" />
            </div>
            {clienteId && (
              <Button variant="ghost" onClick={() => setClienteId(null)}>
                Limpar
              </Button>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary size-4" checked={entregue} onChange={(e) => setEntregue(e.target.checked)} />
          Entregue agora <span className="text-muted-foreground text-xs">(desmarque se vai gravar e entregar depois)</span>
        </label>
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">R$</span>
            <Input aria-label="Desconto" inputMode="decimal" className="pl-8" placeholder="Desconto" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </div>
          {valorDesconto > 0 && <Input placeholder="Motivo do desconto" value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
        </div>
      </Card>

      {/* Pagamento */}
      <Card className="gap-3">
        <CardTitle>Pagamento</CardTitle>
        <div className="grid grid-cols-5 gap-1">
          {(['pix', 'dinheiro', 'cartao', 'boleto', 'fiado'] as Forma[]).map((f) => (
            <button
              key={f}
              onClick={() => setForma(f)}
              className={cn('rounded-lg border py-2.5 text-xs font-medium', forma === f ? 'border-primary bg-primary-soft text-primary-strong' : 'bg-card')}
            >
              {f === 'fiado' ? 'Fiado' : FORMAS[f]}
            </button>
          ))}
        </div>
        {forma === 'dinheiro' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">R$</span>
              <Input aria-label="Valor recebido" inputMode="decimal" className="pl-8" placeholder="Valor recebido (para o troco)" value={recebido} onChange={(e) => setRecebido(e.target.value)} />
            </div>
            {troco != null && troco >= 0 && <span className="text-primary-strong text-sm font-semibold">Troco {formatarBRL(troco)}</span>}
          </div>
        )}
        {forma === 'fiado' &&
          (cliente?.confianca ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <ShieldCheck className="size-3.5" /> Vai pagar quando?
              </p>
              <Input aria-label="Vencimento" type="date" min={hojeISO()} value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
          ) : (
            <p className="text-warning text-sm">Fiado só para cliente de confiança — escolha o cliente acima (marcado como de confiança no cadastro).</p>
          ))}
      </Card>

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {/* Total + finalizar (fixo embaixo no celular) */}
      <div className="bg-background/95 fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-10 space-y-2 border-t p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="flex items-baseline justify-between px-1">
          <span className="text-muted-foreground text-sm">
            Total{valorDesconto > 0 ? ` (desconto ${formatarBRL(valorDesconto)})` : ''}
          </span>
          <span className="text-2xl font-semibold tracking-tight">{formatarBRL(total)}</span>
        </div>
        {erros.length > 0 && linhas.length > 0 && <p className="text-muted-foreground px-1 text-xs">{erros[0]}</p>}
        <Button size="lg" className="h-12 w-full text-base" disabled={salvando || erros.length > 0} onClick={finalizar}>
          {salvando ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Finalizar venda
        </Button>
      </div>
    </div>
  )
}

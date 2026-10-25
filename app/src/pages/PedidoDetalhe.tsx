import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, CheckCircle2, Copy, FileText, Loader2, MessageCircle, RotateCcw, Save, User, XCircle, Zap } from 'lucide-react'
import { AnexosPedido } from '@/components/Anexos'
import { PagamentosPedido } from '@/components/PagamentosPedido'
import { BotaoVer3D } from '@/components/Provador3D'
import { lerMockup } from '@/lib/mockup'
import { repetirPedido } from '@/lib/anexos'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatarBRL } from '@/lib/dinheiro'
import { formatarData, hojeISO, numeroOrcamento, numeroPedido } from '@/lib/orcamento'
import { atualizarPedido, buscarPedido, descreverPrazo, ETAPAS, mudarStatusPedido, TITULO_STATUS, type Pedido, type StatusPedido } from '@/lib/pedidos'
import { linkWhatsApp } from '@/lib/publico'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function PedidoDetalhe() {
  const { id = '' } = useParams()
  const [p, setP] = useState<Pedido | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [prazo, setPrazo] = useState('')
  const [nota, setNota] = useState('')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [hoje] = useState(hojeISO)
  const navigate = useNavigate()
  const [repetindo, setRepetindo] = useState(false)

  async function repetir() {
    setRepetindo(true)
    setErro(null)
    try {
      const orc = await repetirPedido(id)
      navigate(`/orcamentos/${orc}`)
    } catch (e) {
      setErro((e as Error).message)
      setRepetindo(false)
    }
  }

  async function carregar() {
    try {
      const d = await buscarPedido(id)
      setP(d)
      if (d) {
        setPrazo(d.prazo_entrega ?? '')
        setNota(d.nota_venda ?? '')
        setObs(d.observacao ?? '')
      }
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  useEffect(() => {
    void carregar()
    supabase
      .from('perfis')
      .select('id, nome')
      .then(({ data }) => setNomes(Object.fromEntries(((data ?? []) as { id: string; nome: string }[]).map((x) => [x.id, x.nome]))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function mudar(status: StatusPedido, msg: string) {
    setSalvando(true)
    setErro(null)
    try {
      await mudarStatusPedido(id, status)
      await carregar()
      setAviso(msg)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
      setConfirmarCancelar(false)
    }
  }

  async function salvarDados() {
    setSalvando(true)
    setErro(null)
    try {
      await atualizarPedido(id, {
        prazo_entrega: prazo || null,
        nota_venda: nota.trim() || null,
        observacao: obs.trim() || null,
      })
      await carregar()
      setAviso('Dados do pedido salvos.')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  if (p === undefined && !erro)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
  if (!p) return <p className="text-destructive">{erro ?? 'Pedido não encontrado.'}</p>

  const cancelado = p.status === 'cancelado'
  const iAtual = ETAPAS.findIndex((e) => e.status === p.status)
  const prazoInfo = p.status !== 'entregue' && !cancelado ? descreverPrazo(p.prazo_entrega, hoje) : null
  const cli = p.cliente
  const nomeCliente = cli ? (cli.tipo === 'pj' && cli.nome_fantasia ? cli.nome_fantasia : cli.nome) : 'Consumidor'
  const fone = cli?.celular || cli?.telefone
  const mensagemPronto = `Olá${cli ? ` ${cli.tipo === 'pj' ? nomeCliente : cli.nome.split(' ')[0]}` : ''}! Seu pedido ${numeroPedido(p.numero)} da Art's Brindes está pronto. 😊`
  const alterado = prazo !== (p.prazo_entrega ?? '') || nota !== (p.nota_venda ?? '') || obs !== (p.observacao ?? '')
  const quem = (h: Pedido['historico'][number]) => (h.por ? (nomes[h.por] ?? 'Equipe') : h.por_nome ? h.por_nome.replace(' (pelo link)', ' (cliente, pelo link)') : 'Sistema')

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <header className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/pedidos" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
            {numeroPedido(p.numero)}
            {p.origem === 'venda_rapida' && (
              <span className="bg-muted text-foreground flex items-center gap-0.5 rounded-full px-1.5 font-sans">
                <Zap className="size-3" /> Venda de balcão
              </span>
            )}
          </p>
          <h1 className="titulo-pagina truncate">{nomeCliente}</h1>
        </div>
        {prazoInfo && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              prazoInfo.tom === 'atrasado' ? 'bg-destructive-soft text-destructive' : prazoInfo.tom === 'normal' ? 'bg-muted' : 'bg-warning-soft text-warning',
            )}
          >
            {prazoInfo.texto}
          </span>
        )}
      </header>

      {/* Etapas */}
      {cancelado ? (
        <Card className="text-muted-foreground flex-row items-center gap-3">
          <XCircle className="size-5" />
          <p className="flex-1 text-sm">Pedido cancelado.</p>
          <Button variant="outline" size="sm" disabled={salvando} onClick={() => mudar('aprovado', 'Pedido reaberto.')}>
            <RotateCcw /> Reabrir
          </Button>
        </Card>
      ) : (
        <Card className="gap-3">
          <ol className="grid grid-cols-4 gap-1">
            {ETAPAS.map((e, i) => {
              const feito = i < iAtual
              const atual = i === iAtual
              return (
                <li key={e.status}>
                  <button
                    disabled={salvando || atual}
                    onClick={() => mudar(e.status, `Pedido movido para ${e.titulo}.`)}
                    className={cn(
                      'flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-xs font-medium transition-colors',
                      atual ? 'bg-primary-soft text-primary-strong' : 'hover:bg-accent text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn('grid size-7 place-items-center rounded-full border text-[11px]', feito && 'bg-success border-success text-white', atual && 'bg-primary border-primary text-white')}
                    >
                      {feito ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    {e.titulo}
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="text-muted-foreground text-center text-xs">Toque numa etapa para mover o pedido.</p>
        </Card>
      )}

      {aviso && !erro && (
        <p className="text-success flex items-center gap-1 text-sm">
          <CheckCircle2 className="size-4" /> {aviso}
        </p>
      )}
      {erro && <p className="text-destructive text-sm">{erro}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {/* Itens */}
          <Card>
            <CardTitle>Itens</CardTitle>
            <div className="divide-y rounded-xl border">
              {p.itens.map((i, n) => (
                <div key={n} className="flex gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span className="text-primary-strong">{i.quantidade}×</span> {i.descricao}
                    </p>
                    {i.detalhe && <p className="text-muted-foreground text-sm whitespace-pre-line">{i.detalhe}</p>}
                    {i.item_do_cliente && <p className="text-muted-foreground text-xs">Peça do cliente</p>}
                    {(() => {
                      const m = lerMockup(i.mockup)
                      return m ? <BotaoVer3D mockup={m} /> : null
                    })()}
                  </div>
                  <p className="shrink-0 text-sm">{formatarBRL(i.quantidade * (i.preco_unitario + i.adicional))}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm">
              <Linha rotulo="Subtotal" valor={formatarBRL(p.subtotal)} />
              {p.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarBRL(p.desconto)}`} />}
              {p.frete > 0 && <Linha rotulo={p.frete_repassado ? 'Frete' : 'Frete (loja paga)'} valor={formatarBRL(p.frete)} />}
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="font-medium">Total</span>
                <span className="text-xl font-semibold">{formatarBRL(p.total)}</span>
              </div>
              {p.valor_sinal > 0 && <Linha rotulo={`Sinal combinado (${String(p.sinal_percentual ?? '').replace('.', ',')}%)`} valor={formatarBRL(p.valor_sinal)} />}
            </div>
          </Card>

          <PagamentosPedido p={p} nomes={nomes} onMudou={carregar} />

          <AnexosPedido pedidoId={p.id} />

          {/* Dados editáveis */}
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prazo">Prazo de entrega</Label>
                <Input id="prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nota">Nº da nota de venda (opcional)</Label>
                <Input id="nota" placeholder="Emitida no portal do MEI" value={nota} onChange={(e) => setNota(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs">Observação</Label>
              <Textarea id="obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            {alterado && (
              <Button onClick={salvarDados} disabled={salvando} className="self-end">
                <Save /> Salvar alterações
              </Button>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {/* Cliente */}
          <Card className="gap-3">
            <CardTitle className="flex items-center gap-2">
              <User className="size-4" /> Cliente
            </CardTitle>
            {cli ? (
              <>
                <Link to={`/clientes/${cli.id}`} className="font-medium hover:underline">
                  {nomeCliente}
                </Link>
                <p className="text-muted-foreground text-sm">{[fone, cli.cidade && `${cli.cidade}${cli.uf ? ` - ${cli.uf}` : ''}`].filter(Boolean).join(' · ')}</p>
                {fone && (
                  <Button variant="outline" asChild>
                    <a href={linkWhatsApp(fone, p.status === 'pronto' ? mensagemPronto : `Olá! Sobre o pedido ${numeroPedido(p.numero)} da Art's Brindes:`)} target="_blank" rel="noreferrer">
                      <MessageCircle /> {p.status === 'pronto' ? 'Avisar que está pronto' : 'WhatsApp'}
                    </a>
                  </Button>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Consumidor (sem cadastro)</p>
            )}
            {p.orcamento_id && p.orcamento && (
              <Link to={`/orcamentos/${p.orcamento_id}`} className="text-muted-foreground hover:text-foreground flex items-center gap-1 border-t pt-3 text-sm">
                <FileText className="size-4" /> Orçamento {numeroOrcamento(p.orcamento.numero)}
              </Link>
            )}
          </Card>

          {/* Histórico */}
          <Card className="gap-3">
            <CardTitle>Histórico</CardTitle>
            <ol className="space-y-3">
              {p.historico.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="bg-border mt-1.5 size-2 shrink-0 rounded-full" />
                  <div>
                    <p>
                      {h.de ? (
                        <>
                          {TITULO_STATUS[h.de as StatusPedido] ?? h.de} → <b>{TITULO_STATUS[h.para]}</b>
                        </>
                      ) : (
                        <b>Pedido criado ({TITULO_STATUS[h.para]})</b>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {quem(h)} · {formatarData(h.em)}{' '}
                      {new Date(h.em).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {p.cliente_id && (
            <Card className="gap-2">
              <Button variant="outline" onClick={repetir} disabled={repetindo}>
                {repetindo ? <Loader2 className="animate-spin" /> : <Copy />} Repetir pedido
              </Button>
              <p className="text-muted-foreground text-xs">Cria um orçamento novo igual (itens, o que gravar e arquivos) com os preços de hoje.</p>
            </Card>
          )}

          {!cancelado && p.status !== 'entregue' && (
            <div className="flex justify-end">
              {confirmarCancelar ? (
                <Button variant="destructive" size="sm" disabled={salvando} onClick={() => mudar('cancelado', 'Pedido cancelado.')}>
                  Confirmar cancelamento
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmarCancelar(true)}>
                  <XCircle /> Cancelar pedido
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{rotulo}</span>
      <span>{valor}</span>
    </div>
  )
}

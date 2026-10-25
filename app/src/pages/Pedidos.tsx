import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, ClipboardList, Loader2, Search, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatarBRL } from '@/lib/dinheiro'
import { hojeISO, numeroPedido } from '@/lib/orcamento'
import { descreverPrazo, ETAPAS, listarPedidos, mudarStatusPedido, proximaEtapa, SITUACAO_PAGAMENTO, TITULO_STATUS, type LinhaPedido, type StatusPedido } from '@/lib/pedidos'
import { cn } from '@/lib/utils'

const LIMITE_ENTREGUES = 15

export function Pedidos() {
  const [pedidos, setPedidos] = useState<LinhaPedido[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [abaCelular, setAbaCelular] = useState<StatusPedido>('aprovado')
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<StatusPedido | null>(null)
  const [hoje] = useState(hojeISO)

  useEffect(() => {
    listarPedidos().then(setPedidos).catch((e: Error) => setErro(e.message))
  }, [])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase().replace(/^ped-?0*/, '')
    return (pedidos ?? []).filter((p) => !t || p.cliente_nome.toLowerCase().includes(t) || String(p.numero).includes(t) || (p.resumo ?? '').toLowerCase().includes(t))
  }, [pedidos, busca])

  const porEtapa = useMemo(() => {
    const m: Record<string, LinhaPedido[]> = {}
    for (const e of ETAPAS) m[e.status] = []
    for (const p of filtrados) if (m[p.status]) m[p.status].push(p)
    // Em produção: mais urgente primeiro; entregues: mais recentes primeiro
    for (const s of ['aprovado', 'gravando', 'pronto']) m[s].sort((a, b) => (a.prazo_entrega ?? '9999').localeCompare(b.prazo_entrega ?? '9999') || a.numero - b.numero)
    m.entregue.sort((a, b) => (b.entregue_em ?? '').localeCompare(a.entregue_em ?? ''))
    return m
  }, [filtrados])

  async function mover(id: string, status: StatusPedido) {
    const antes = pedidos
    setPedidos((ps) => ps?.map((p) => (p.id === id ? { ...p, status, atrasado: status === 'entregue' ? false : p.atrasado, entregue_em: status === 'entregue' ? new Date().toISOString() : p.entregue_em } : p)) ?? null)
    try {
      await mudarStatusPedido(id, status)
    } catch (e) {
      setPedidos(antes)
      setErro((e as Error).message)
    }
  }

  function soltar(e: DragEvent, status: StatusPedido) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setSobre(null)
    setArrastando(null)
    const p = pedidos?.find((x) => x.id === id)
    if (p && p.status !== status) void mover(id, status)
  }

  const atrasados = (pedidos ?? []).filter((p) => p.atrasado).length

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Pedidos</h1>
          {atrasados > 0 && <p className="text-destructive text-sm font-medium">{atrasados} {atrasados === 1 ? 'pedido atrasado' : 'pedidos atrasados'}</p>}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Buscar cliente, número ou item…" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </header>

      {erro && <p className="text-destructive">{erro}</p>}
      {!pedidos && !erro && (
        <div className="flex justify-center py-16">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      )}
      {pedidos && pedidos.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <ClipboardList className="text-primary size-10" />
          <p>Nenhum pedido ainda.</p>
          <p className="max-w-sm text-sm">Os pedidos aparecem aqui sozinhos quando um orçamento é aprovado — pelo cliente no link ou por você.</p>
          <Link to="/orcamentos" className="text-primary-strong text-sm font-medium hover:underline">
            Ir para Orçamentos
          </Link>
        </div>
      )}

      {pedidos && pedidos.length > 0 && (
        <>
          {/* Celular: abas por etapa */}
          <div className="md:hidden">
            <div className="bg-muted mb-3 grid grid-cols-4 gap-1 rounded-xl p-1">
              {ETAPAS.map((e) => (
                <button
                  key={e.status}
                  onClick={() => setAbaCelular(e.status)}
                  className={cn('rounded-lg py-2 text-xs font-medium', abaCelular === e.status ? 'bg-card shadow-subtle border' : 'text-muted-foreground')}
                >
                  {e.titulo}
                  <span className="block text-[11px] font-normal opacity-70">{porEtapa[e.status].length}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {(abaCelular === 'entregue' ? porEtapa.entregue.slice(0, LIMITE_ENTREGUES) : porEtapa[abaCelular] ?? []).map((p) => (
                <Cartao key={p.id} p={p} hoje={hoje} onAvancar={mover} />
              ))}
              {(porEtapa[abaCelular] ?? []).length === 0 && <p className="text-muted-foreground py-10 text-center text-sm">Nenhum pedido em {TITULO_STATUS[abaCelular].toLowerCase()}.</p>}
            </div>
          </div>

          {/* PC: quadro em colunas, arrastar e soltar */}
          <div className="hidden gap-3 md:grid md:grid-cols-4">
            {ETAPAS.map((e) => {
              const lista = e.status === 'entregue' ? porEtapa.entregue.slice(0, LIMITE_ENTREGUES) : porEtapa[e.status]
              return (
                <section
                  key={e.status}
                  onDragOver={(ev) => {
                    ev.preventDefault()
                    setSobre(e.status)
                  }}
                  onDragLeave={() => setSobre((s) => (s === e.status ? null : s))}
                  onDrop={(ev) => soltar(ev, e.status)}
                  className={cn('bg-muted/50 flex min-h-[60vh] flex-col gap-2 rounded-2xl border p-2 transition-colors', sobre === e.status && arrastando && 'border-primary bg-primary-soft/40')}
                >
                  <header className="flex items-center justify-between px-1.5 py-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className={cn('size-2 rounded-full', e.ponto)} /> {e.titulo}
                    </span>
                    <span className="text-muted-foreground text-xs">{porEtapa[e.status].length}</span>
                  </header>
                  {lista.map((p) => (
                    <Cartao
                      key={p.id}
                      p={p}
                      hoje={hoje}
                      onAvancar={mover}
                      arrastavel
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData('text/plain', p.id)
                        ev.dataTransfer.effectAllowed = 'move'
                        setArrastando(p.id)
                      }}
                      onDragEnd={() => {
                        setArrastando(null)
                        setSobre(null)
                      }}
                      fantasma={arrastando === p.id}
                    />
                  ))}
                  {e.status === 'entregue' && porEtapa.entregue.length > LIMITE_ENTREGUES && (
                    <p className="text-muted-foreground px-2 text-center text-xs">Mostrando os {LIMITE_ENTREGUES} mais recentes</p>
                  )}
                  {lista.length === 0 && <p className="text-muted-foreground px-2 py-6 text-center text-xs">Arraste um pedido para cá</p>}
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Cartao({
  p,
  hoje,
  onAvancar,
  arrastavel,
  onDragStart,
  onDragEnd,
  fantasma,
}: {
  p: LinhaPedido
  hoje: string
  onAvancar: (id: string, s: StatusPedido) => void
  arrastavel?: boolean
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: () => void
  fantasma?: boolean
}) {
  const navigate = useNavigate()
  const prazo = p.status === 'entregue' ? null : descreverPrazo(p.prazo_entrega, hoje)
  const prox = proximaEtapa(p.status)
  return (
    <article
      draggable={arrastavel}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => navigate(`/pedidos/${p.id}`)}
      className={cn(
        'bg-card hover:border-border-strong cursor-pointer space-y-2 rounded-xl border p-3 transition-all hover:shadow-[var(--shadow-ring)]',
        p.atrasado && 'border-destructive/60',
        fantasma && 'opacity-40',
        arrastavel && 'active:cursor-grabbing',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
            {numeroPedido(p.numero)}
            {p.origem === 'venda_rapida' && (
              <span className="bg-muted text-foreground flex items-center gap-0.5 rounded-full px-1.5 font-sans text-[10px]">
                <Zap className="size-2.5" /> Balcão
              </span>
            )}
          </p>
          <p className="line-clamp-2 text-sm leading-snug font-semibold">{p.cliente_nome}</p>
        </div>
        <p className="shrink-0 text-sm font-medium">{formatarBRL(p.total)}</p>
      </div>
      {p.resumo && <p className="text-muted-foreground line-clamp-2 text-xs">{p.resumo}</p>}
      {p.situacao_pagamento !== 'a_receber' && p.situacao_pagamento !== 'cancelado' && (
        <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-medium', SITUACAO_PAGAMENTO[p.situacao_pagamento].classe)}>
          {SITUACAO_PAGAMENTO[p.situacao_pagamento].texto}
          {p.situacao_pagamento !== 'pago' && p.saldo > 0 ? ` · falta ${formatarBRL(p.saldo)}` : ''}
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        {prazo ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              prazo.tom === 'atrasado' && 'bg-destructive-soft text-destructive',
              prazo.tom === 'hoje' && 'bg-warning-soft text-warning',
              prazo.tom === 'perto' && 'bg-primary-soft text-primary-strong',
              prazo.tom === 'normal' && 'bg-muted text-muted-foreground',
            )}
          >
            {prazo.texto}
          </span>
        ) : (
          <span className="text-muted-foreground text-[11px]">{p.status === 'entregue' ? 'Entregue' : `${p.quantidade} un`}</span>
        )}
        {prox && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAvancar(p.id, prox)
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
            title={`Mover para ${TITULO_STATUS[prox]}`}
          >
            {TITULO_STATUS[prox]} <ArrowRight className="size-3" />
          </button>
        )}
      </div>
    </article>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarClock, Eye, FileText, Loader2, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarBRL } from '@/lib/dinheiro'
import { formatarData, numeroOrcamento } from '@/lib/orcamento'
import { listarOrcamentos, SITUACOES, type LinhaLista, type Situacao } from '@/lib/orcamentos'
import { cn } from '@/lib/utils'

type Filtro = 'abertos' | Situacao | 'todos'

const FILTROS: [Filtro, string][] = [
  ['abertos', 'Em aberto'],
  ['enviado', 'Aguardando'],
  ['aprovado', 'Aprovados'],
  ['expirado', 'Vencidos'],
  ['recusado', 'Recusados'],
  ['todos', 'Todos'],
]

export function Orcamentos() {
  const [lista, setLista] = useState<LinhaLista[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('abertos')

  useEffect(() => {
    listarOrcamentos().then(setLista).catch((e: Error) => setErro(e.message))
  }, [])

  const contagem = useMemo(() => {
    const c: Record<string, number> = {}
    for (const o of lista ?? []) c[o.situacao] = (c[o.situacao] ?? 0) + 1
    c.abertos = (c.rascunho ?? 0) + (c.enviado ?? 0) + (c.expirado ?? 0)
    return c
  }, [lista])

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase().replace(/^orc-?0*/, '')
    return (lista ?? []).filter(
      (o) =>
        (filtro === 'todos' || (filtro === 'abertos' ? ['rascunho', 'enviado', 'expirado'].includes(o.situacao) : o.situacao === filtro)) &&
        (!t || o.cliente_nome.toLowerCase().includes(t) || String(o.numero).includes(t)),
    )
  }, [lista, busca, filtro])

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="titulo-pagina">Orçamentos</h1>
        <Button asChild>
          <Link to="/orcamentos/novo">
            <Plus /> Novo
          </Link>
        </Button>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Buscar por cliente ou número…" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {FILTROS.map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
                filtro === valor ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {texto}
              {valor !== 'todos' && contagem[valor] ? <span className="text-xs opacity-70">{contagem[valor]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="text-destructive">{erro}</p>}
      {!lista && !erro && (
        <div className="flex justify-center py-16">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      )}
      {lista && visiveis.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <FileText className="text-primary size-10" />
          {lista.length === 0 ? (
            <>
              <p>Nenhum orçamento ainda.</p>
              <Button asChild>
                <Link to="/orcamentos/novo">
                  <Plus /> Fazer o primeiro
                </Link>
              </Button>
            </>
          ) : (
            <p>Nada neste filtro.</p>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {visiveis.map((o) => {
          const s = SITUACOES[o.situacao]
          return (
            <Link key={o.id} to={`/orcamentos/${o.id}`} className="block">
              <Card className="hover:border-border-strong hover:shadow-ring gap-2 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-muted-foreground font-mono text-xs">{numeroOrcamento(o.numero)}</p>
                    <p className="truncate font-semibold">{o.cliente_nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatarBRL(o.total)}</p>
                    <p className="text-muted-foreground text-xs">{o.quantidade} un</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', s.classe)}>{s.texto}</span>
                  {o.pede_sinal && o.situacao !== 'aprovado' && <Badge variant="outline">Sinal {formatarBRL(o.valor_sinal)}</Badge>}
                  {o.visualizado_em && o.situacao === 'enviado' && (
                    <Badge variant="outline">
                      <Eye className="size-3" /> Cliente viu
                    </Badge>
                  )}
                  <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                    <CalendarClock className="size-3" />
                    {o.situacao === 'aprovado' ? `Entrega ${formatarData(o.prazo_entrega)}` : `Vale até ${formatarData(o.validade)}`}
                  </span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

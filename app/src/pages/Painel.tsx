import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, ClipboardList, FileText, Loader2, PackageX, TrendingUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { formatarBRL } from '@/lib/dinheiro'
import { formatarData, numeroOrcamento } from '@/lib/orcamento'
import { listarOrcamentos, type LinhaLista } from '@/lib/orcamentos'
import { listarPedidos, type LinhaPedido } from '@/lib/pedidos'
import { testarConexao } from '@/lib/supabase'

const EM_BREVE = [
  { titulo: 'A receber', texto: 'Sinais, fiado e vencidos', Icone: Wallet, cor: 'text-success bg-success-soft' },
  { titulo: 'Estoque baixo', texto: 'Cores abaixo do mínimo', Icone: PackageX, cor: 'text-warning bg-warning-soft' },
  { titulo: 'Resultado do mês', texto: 'Vendeu, gastou e lucrou', Icone: TrendingUp, cor: 'text-foreground bg-muted' },
]

export function Painel() {
  const { perfil } = useAuth()
  const [banco, setBanco] = useState<'testando' | 'ok' | 'erro'>('testando')
  const [orcs, setOrcs] = useState<LinhaLista[] | null>(null)
  const [peds, setPeds] = useState<LinhaPedido[] | null>(null)
  const [seteDias] = useState(() => Date.now() - 7 * 86400000)

  useEffect(() => {
    testarConexao().then((ok) => setBanco(ok ? 'ok' : 'erro'))
    listarOrcamentos().then(setOrcs).catch(() => setOrcs([]))
    listarPedidos().then(setPeds).catch(() => setPeds([]))
  }, [])

  const aguardando = (orcs ?? []).filter((o) => o.situacao === 'enviado' || o.situacao === 'rascunho')
  const emProducao = (peds ?? []).filter((p) => ['aprovado', 'gravando', 'pronto'].includes(p.status))
  const atrasados = emProducao.filter((p) => p.atrasado).length
  const prontos = emProducao.filter((p) => p.status === 'pronto').length
  const valorAguardando = aguardando.reduce((s, o) => s + o.total, 0)
  const aprovadosLink = (orcs ?? []).filter((o) => o.situacao === 'aprovado' && o.aprovado_por?.endsWith('(pelo link)') && o.aprovado_em && new Date(o.aprovado_em).getTime() > seteDias)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Painel</p>
          <h1 className="titulo-pagina">Olá, {perfil?.nome ?? '...'} 👋</h1>
        </div>
        {banco === 'testando' && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
        {banco === 'ok' && <Badge variant="sucesso">● Banco conectado</Badge>}
        {banco === 'erro' && <Badge className="bg-destructive-soft text-destructive">● Sem conexão com o banco</Badge>}
      </header>

      {aprovadosLink.length > 0 && (
        <Card className="border-success bg-success-soft gap-2">
          <p className="text-success flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4" /> Aprovados pelo cliente (últimos 7 dias)
          </p>
          <ul className="divide-success/20 divide-y">
            {aprovadosLink.map((o) => (
              <li key={o.id}>
                <Link to={`/orcamentos/${o.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:underline">
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground font-mono text-xs">{numeroOrcamento(o.numero)}</span> {o.cliente_nome} · {o.aprovado_por?.replace(' (pelo link)', '')}
                  </span>
                  <span className="shrink-0 font-medium">{formatarBRL(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Link to="/orcamentos">
          <Card className="hover:border-border-strong hover:shadow-ring h-full gap-3 transition-all">
            <div className="flex items-center gap-2.5">
              <span className="bg-muted grid size-8 place-items-center rounded-lg">
                <FileText className="size-4" />
              </span>
              <p className="text-sm font-medium">Orçamentos aguardando</p>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{orcs ? aguardando.length : '—'}</p>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{orcs ? `${formatarBRL(valorAguardando)} em aberto` : 'Carregando…'}</p>
              {aguardando[0] && <span className="text-muted-foreground text-xs">vence {formatarData(aguardando.map((o) => o.validade).sort()[0])}</span>}
            </div>
          </Card>
        </Link>
        <Link to="/pedidos">
          <Card className={`hover:border-border-strong hover:shadow-ring h-full gap-3 transition-all ${atrasados ? 'border-destructive/60' : ''}`}>
            <div className="flex items-center gap-2.5">
              <span className="bg-primary-soft text-primary-strong grid size-8 place-items-center rounded-lg">
                <ClipboardList className="size-4" />
              </span>
              <p className="text-sm font-medium">Em produção</p>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{peds ? emProducao.length : '—'}</p>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <p className="text-muted-foreground text-xs">{prontos ? `${prontos} pronto${prontos > 1 ? 's' : ''} para entregar` : 'Pedidos em andamento'}</p>
              {atrasados > 0 && <span className="bg-destructive-soft text-destructive rounded-full px-2 py-0.5 text-xs font-medium">{atrasados} atrasado{atrasados > 1 ? 's' : ''}</span>}
            </div>
          </Card>
        </Link>
        {EM_BREVE.map(({ titulo, texto, Icone, cor }) => (
          <Card key={titulo} className="gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`grid size-8 place-items-center rounded-lg ${cor}`}>
                <Icone className="size-4" />
              </span>
              <p className="text-sm font-medium">{titulo}</p>
            </div>
            <p className="text-muted-foreground/60 text-2xl font-semibold tracking-tight">—</p>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{texto}</p>
              <Badge variant="outline">Em breve</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, ClipboardList, FileText, Loader2, PackageX, Plus, TrendingUp, Wallet, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { formatarBRL } from '@/lib/dinheiro'
import { formatarData, numeroOrcamento } from '@/lib/orcamento'
import { listarOrcamentos, type LinhaLista } from '@/lib/orcamentos'
import { aReceber, listarPedidos, SITUACAO_PAGAMENTO, type LinhaPedido } from '@/lib/pedidos'
import { numeroPedido } from '@/lib/orcamento'
import { testarConexao } from '@/lib/supabase'

const EM_BREVE = [
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
  const receber = aReceber(peds ?? [])
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

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button asChild>
          <Link to="/venda-rapida">
            <Zap /> Venda rápida
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/orcamentos/novo">
            <Plus /> Novo orçamento
          </Link>
        </Button>
      </div>

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
        <Card className={`h-full gap-3 sm:col-span-2 xl:col-span-1 xl:row-span-2 ${receber.fiadoVencido ? 'border-destructive/60' : ''}`}>
          <div className="flex items-center gap-2.5">
            <span className="bg-success-soft text-success grid size-8 place-items-center rounded-lg">
              <Wallet className="size-4" />
            </span>
            <p className="text-sm font-medium">A receber</p>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{peds ? formatarBRL(receber.total) : '—'}</p>
          <div className="flex flex-wrap gap-1.5">
            {receber.sinaisPendentes > 0 && <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 text-xs font-medium">{receber.sinaisPendentes} sinal{receber.sinaisPendentes > 1 ? 'is' : ''} pendente{receber.sinaisPendentes > 1 ? 's' : ''}</span>}
            {receber.fiadoVencido > 0 && <span className="bg-destructive-soft text-destructive rounded-full px-2 py-0.5 text-xs font-medium">{formatarBRL(receber.fiadoVencido)} de fiado vencido</span>}
          </div>
          {receber.lista.length > 0 ? (
            <ul className="divide-y border-t">
              {receber.lista.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link to={`/pedidos/${p.id}`} className="hover:bg-accent -mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{p.cliente_nome}</span>
                      <span className={`mt-0.5 inline-block rounded-full px-1.5 text-[11px] font-medium ${SITUACAO_PAGAMENTO[p.situacao_pagamento].classe}`}>
                        {SITUACAO_PAGAMENTO[p.situacao_pagamento].texto}
                      </span>{' '}
                      <span className="text-muted-foreground font-mono text-[11px]">{numeroPedido(p.numero)}</span>
                    </span>
                    <span className="shrink-0 font-medium">{formatarBRL(p.saldo)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs">{peds ? 'Nada pendente. 🎉' : 'Carregando…'}</p>
          )}
        </Card>
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

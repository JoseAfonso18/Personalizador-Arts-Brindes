import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Loader2, Package, Plus, Search, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarBRL } from '@/lib/dinheiro'
import { rotulo } from '@/lib/preco'
import { listarProdutos, type Produto } from '@/lib/produtos'
import { cn } from '@/lib/utils'

type Filtro = 'todos' | 'produto' | 'servico_gravacao'

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [verInativos, setVerInativos] = useState(false)

  useEffect(() => {
    listarProdutos().then(setProdutos).catch((e: Error) => setErro(e.message))
  }, [])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (produtos ?? []).filter(
      (p) =>
        (verInativos || p.ativo) &&
        (filtro === 'todos' || p.tipo === filtro) &&
        (!termo || p.nome.toLowerCase().includes(termo) || p.variacoes.some((v) => v.nome.toLowerCase().includes(termo))),
    )
  }, [produtos, busca, filtro, verInativos])

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold md:text-3xl">Produtos</h1>
        <Button asChild>
          <Link to="/produtos/novo">
            <Plus /> Novo
          </Link>
        </Button>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Buscar produto ou cor…" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['todos', 'Todos'],
              ['produto', 'Produtos'],
              ['servico_gravacao', 'Serviços'],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                filtro === valor ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground',
              )}
            >
              {texto}
            </button>
          ))}
          <label className="text-muted-foreground ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-primary size-4" checked={verInativos} onChange={(e) => setVerInativos(e.target.checked)} />
            Ver inativos
          </label>
        </div>
      </div>

      {erro && <p className="text-destructive">{erro}</p>}
      {!produtos && !erro && (
        <div className="flex justify-center py-16">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      )}

      {produtos && visiveis.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <Package className="text-primary size-10" />
          {produtos.length === 0 ? (
            <>
              <p>Nenhum produto cadastrado ainda.</p>
              <Button asChild>
                <Link to="/produtos/novo">
                  <Plus /> Cadastrar o primeiro
                </Link>
              </Button>
            </>
          ) : (
            <p>Nada encontrado com esse filtro.</p>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {visiveis.map((p) => (
          <CartaoProduto key={p.id} p={p} />
        ))}
      </div>
    </div>
  )
}

function CartaoProduto({ p }: { p: Produto }) {
  const estoque = p.variacoes.reduce((s, v) => s + v.estoque, 0)
  const baixas = p.variacoes.filter((v) => v.ativo && v.estoque <= v.estoque_minimo && v.estoque_minimo > 0)
  return (
    <Link to={`/produtos/${p.id}`} className="block">
      <Card className={cn('hover:border-primary/60 gap-3 transition-colors', !p.ativo && 'opacity-60')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.nome}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {p.tipo === 'servico_gravacao' ? (
                <Badge variant="secondary">
                  <Sparkles className="size-3" /> Serviço de gravação
                </Badge>
              ) : (
                <Badge variant="outline">
                  {p.variacoes.length} {p.variacoes.length === 1 ? 'cor' : 'cores'} · {estoque} em estoque
                </Badge>
              )}
              {!p.ativo && <Badge variant="outline">Inativo</Badge>}
              {baixas.length > 0 && (
                <Badge variant="alerta">
                  <AlertTriangle className="size-3" /> Estoque baixo: {baixas.map((v) => v.nome).join(', ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.faixas.length === 0 ? (
            <span className="text-destructive text-sm">Sem preço</span>
          ) : (
            p.faixas.map((f) => (
              <span key={f.qtd_min} className="bg-secondary rounded-md px-2 py-1 text-xs">
                <span className="text-muted-foreground">{rotulo(f)} un</span> <span className="font-semibold">{formatarBRL(f.preco)}</span>
              </span>
            ))
          )}
        </div>
      </Card>
    </Link>
  )
}

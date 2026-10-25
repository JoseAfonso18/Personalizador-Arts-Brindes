import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Building2, Loader2, MapPin, Phone, Plus, Search, ShieldCheck, User, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { listarClientes, type Cliente } from '@/lib/clientes'
import { formatarCNPJ, formatarCPF, limparCnpj } from '@/lib/documento'
import { cn } from '@/lib/utils'

type Filtro = 'todos' | 'pf' | 'pj' | 'confianca'

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [verInativos, setVerInativos] = useState(false)

  useEffect(() => {
    listarClientes().then(setClientes).catch((e: Error) => setErro(e.message))
  }, [])

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const tDoc = limparCnpj(busca)
    return (clientes ?? []).filter(
      (c) =>
        (verInativos || c.ativo) &&
        (filtro === 'todos' || (filtro === 'confianca' ? c.confianca : c.tipo === filtro)) &&
        (!t ||
          c.nome.toLowerCase().includes(t) ||
          (c.nome_fantasia ?? '').toLowerCase().includes(t) ||
          (c.cidade ?? '').toLowerCase().includes(t) ||
          (tDoc.length >= 3 && ((c.cpf_cnpj ?? '').includes(tDoc) || (c.celular ?? '').replace(/\D/g, '').includes(tDoc)))),
    )
  }, [clientes, busca, filtro, verInativos])

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="titulo-pagina">Clientes</h1>
        <Button asChild>
          <Link to="/clientes/novo">
            <Plus /> Novo
          </Link>
        </Button>
      </header>

      <div className="space-y-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Buscar por nome, CPF/CNPJ, celular ou cidade…" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['todos', 'Todos'],
              ['pj', 'Empresas'],
              ['pf', 'Pessoas'],
              ['confianca', 'De confiança'],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                filtro === valor ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground',
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
      {!clientes && !erro && (
        <div className="flex justify-center py-16">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      )}
      {clientes && visiveis.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <Users className="text-primary size-10" />
          {clientes.length === 0 ? (
            <>
              <p>Nenhum cliente cadastrado ainda.</p>
              <Button asChild>
                <Link to="/clientes/novo">
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
        {visiveis.map((c) => (
          <Link key={c.id} to={`/clientes/${c.id}`} className="block">
            <Card className={cn('hover:border-border-strong hover:shadow-ring gap-2 transition-all', !c.ativo && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-full">
                  {c.tipo === 'pj' ? <Building2 className="size-4" /> : <User className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.tipo === 'pj' && c.nome_fantasia ? c.nome_fantasia : c.nome}</p>
                  {c.tipo === 'pj' && c.nome_fantasia && <p className="text-muted-foreground truncate text-xs">{c.nome}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.cpf_cnpj && <Badge variant="outline">{c.tipo === 'pj' ? formatarCNPJ(c.cpf_cnpj) : formatarCPF(c.cpf_cnpj)}</Badge>}
                    {c.confianca && (
                      <Badge variant="sucesso">
                        <ShieldCheck className="size-3" /> Confiança
                      </Badge>
                    )}
                    {!c.ativo && <Badge variant="outline">Inativo</Badge>}
                  </div>
                </div>
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pl-12 text-xs">
                {(c.celular || c.telefone) && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" /> {c.celular || c.telefone}
                  </span>
                )}
                {c.cidade && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {c.cidade}
                    {c.uf ? ` - ${c.uf}` : ''}
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type OpcaoSeletor = { valor: string; rotulo: string; detalhe?: string; busca?: string }

/** Campo com busca (combobox): digita para filtrar e escolhe da lista. */
export function Seletor({
  opcoes,
  valor,
  onChange,
  placeholder = 'Escolher…',
  vazio = 'Nada encontrado',
  rodape,
  id,
}: {
  opcoes: OpcaoSeletor[]
  valor: string | null
  onChange: (valor: string) => void
  placeholder?: string
  vazio?: string
  rodape?: (fechar: () => void, termo: string) => ReactNode
  id?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState('')
  const caixa = useRef<HTMLDivElement>(null)
  const selecionada = opcoes.find((o) => o.valor === valor)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const filtradas = useMemo(() => {
    const t = termo.trim().toLowerCase()
    const lista = t ? opcoes.filter((o) => `${o.rotulo} ${o.detalhe ?? ''} ${o.busca ?? ''}`.toLowerCase().includes(t)) : opcoes
    return lista.slice(0, 50)
  }, [opcoes, termo])

  const fechar = () => {
    setAberto(false)
    setTermo('')
  }

  return (
    <div ref={caixa} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="border-input bg-card hover:border-foreground/40 flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-base md:h-9 md:text-sm"
      >
        <span className={cn('truncate', !selecionada && 'text-muted-foreground')}>{selecionada?.rotulo ?? placeholder}</span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
      </button>
      {aberto && (
        <div className="bg-popover absolute z-40 mt-1 w-full overflow-hidden rounded-xl border shadow-[var(--shadow-ring),0_10px_15px_-3px_rgb(0_0_0/0.1)]">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground size-4" />
            <input
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') fechar()
                if (e.key === 'Enter' && filtradas[0]) {
                  e.preventDefault()
                  onChange(filtradas[0].valor)
                  fechar()
                }
              }}
              placeholder="Buscar…"
              className="h-10 w-full bg-transparent text-base outline-none md:text-sm"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto p-1">
            {filtradas.length === 0 && <li className="text-muted-foreground px-3 py-2 text-sm">{vazio}</li>}
            {filtradas.map((o) => (
              <li key={o.valor}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.valor)
                    fechar()
                  }}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
                >
                  <Check className={cn('size-4 shrink-0', o.valor === valor ? 'text-primary' : 'opacity-0')} />
                  <span className="min-w-0">
                    <span className="block truncate">{o.rotulo}</span>
                    {o.detalhe && <span className="text-muted-foreground block truncate text-xs">{o.detalhe}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {rodape && <div className="border-t p-1">{rodape(fechar, termo)}</div>}
        </div>
      )}
    </div>
  )
}

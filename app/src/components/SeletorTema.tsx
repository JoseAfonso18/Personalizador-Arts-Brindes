import { Monitor, Moon, Sun } from 'lucide-react'
import { useTema, type PreferenciaTema } from '@/lib/tema'
import { cn } from '@/lib/utils'

const OPCOES: { valor: PreferenciaTema; titulo: string; Icone: typeof Sun }[] = [
  { valor: 'claro', titulo: 'Claro', Icone: Sun },
  { valor: 'escuro', titulo: 'Escuro', Icone: Moon },
  { valor: 'sistema', titulo: 'Automático', Icone: Monitor },
]

/** Botões claro / escuro / automático (segue o celular ou PC). */
export function SeletorTema({ className }: { className?: string }) {
  const { tema, setTema } = useTema()
  return (
    <div role="radiogroup" aria-label="Tema" className={cn('bg-muted grid grid-cols-3 gap-1 rounded-lg p-1', className)}>
      {OPCOES.map(({ valor, titulo, Icone }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={tema === valor}
          title={titulo}
          onClick={() => setTema(valor)}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
            tema === valor ? 'bg-card text-foreground shadow-subtle border' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icone className="size-3.5" />
          <span>{titulo}</span>
        </button>
      ))}
    </div>
  )
}

import { cn } from '@/lib/utils'

/**
 * Marca da Art's Brindes. Por enquanto é texto; quando a logo chegar,
 * troca aqui (public/brand/logo-claro.svg e logo-escuro.svg) e vale para o sistema todo.
 */
export function Logo({ className, compacta = false }: { className?: string; compacta?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-lg text-sm font-bold">A</span>
      {!compacta && (
        <span className="leading-none">
          Art's <span className="text-primary-strong">Brindes</span>
        </span>
      )}
    </span>
  )
}

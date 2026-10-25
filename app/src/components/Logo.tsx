import { cn } from '@/lib/utils'

/**
 * Logo oficial da Art's Brindes (public/brand/).
 * Mostra a versão de "Brindes" cinza no tema claro e branca no escuro.
 * A altura vem pela className (ex.: "h-9"); a largura acompanha (proporção ~2:1).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-9 shrink-0', className)}>
      <img src="/brand/logo-claro.svg" alt="Art's Brindes" className="h-full w-auto dark:hidden" />
      <img src="/brand/logo-escuro.svg" alt="Art's Brindes" className="hidden h-full w-auto dark:block" />
    </span>
  )
}

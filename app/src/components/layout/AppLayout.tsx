import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { LogOut, Menu as MenuIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { MENU } from '@/lib/menu'
import { cn } from '@/lib/utils'

/** Casca do sistema: barra lateral no PC, abas embaixo no celular. */
export function AppLayout() {
  const { perfil, sair } = useAuth()
  const [maisAberto, setMaisAberto] = useState(false)
  const principais = MENU.filter((m) => m.principal)
  const outros = MENU.filter((m) => !m.principal)

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral (PC) */}
      <aside className="bg-card hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="px-5 py-5">
          <p className="text-primary text-xs font-semibold tracking-widest uppercase">Art's Brindes</p>
          <p className="font-display text-lg font-bold">Gestão</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {MENU.map((m) => (
            <NavLink
              key={m.caminho}
              to={m.caminho}
              end={m.caminho === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <m.icone className="size-4" />
              {m.titulo}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate px-2 text-sm font-medium">{perfil?.nome ?? '...'}</p>
          <Button variant="ghost" size="sm" className="text-muted-foreground w-full justify-start" onClick={sair}>
            <LogOut /> Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular) */}
        <header className="bg-background/90 sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden">
          <p className="font-display font-bold">
            <span className="text-primary">Art's</span> Gestão
          </p>
          <span className="text-muted-foreground max-w-40 truncate text-sm">{perfil?.nome}</span>
        </header>

        <main className="flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Abas de baixo (celular) */}
      <nav className="bg-card/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {principais.map((m) => (
          <NavLink
            key={m.caminho}
            to={m.caminho}
            end={m.caminho === '/'}
            onClick={() => setMaisAberto(false)}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 py-2.5 text-[11px]', isActive ? 'text-primary' : 'text-muted-foreground')
            }
          >
            <m.icone className="size-5" />
            {m.titulo}
          </NavLink>
        ))}
        <button
          onClick={() => setMaisAberto((v) => !v)}
          className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px]', maisAberto ? 'text-primary' : 'text-muted-foreground')}
        >
          {maisAberto ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          Mais
        </button>
      </nav>

      {/* Painel "Mais" (celular) */}
      {maisAberto && (
        <div className="fixed inset-0 z-20 md:hidden" onClick={() => setMaisAberto(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="bg-card absolute inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] rounded-t-2xl border-t p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2">
              {outros.map((m) => (
                <NavLink
                  key={m.caminho}
                  to={m.caminho}
                  onClick={() => setMaisAberto(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-2 rounded-xl p-3 text-xs',
                      isActive ? 'bg-primary/15 text-primary' : 'bg-secondary text-foreground',
                    )
                  }
                >
                  <m.icone className="size-5" />
                  {m.titulo}
                </NavLink>
              ))}
            </div>
            <Button variant="ghost" className="text-muted-foreground mt-2 w-full" onClick={sair}>
              <LogOut /> Sair
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

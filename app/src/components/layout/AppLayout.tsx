import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { LogOut, Menu as MenuIcon, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { SeletorTema } from '@/components/SeletorTema'
import { useAuth } from '@/lib/auth'
import { MENU } from '@/lib/menu'
import { cn } from '@/lib/utils'

/** Casca do sistema: barra lateral no PC, abas embaixo no celular. */
export function AppLayout() {
  const { perfil, sair } = useAuth()
  const [maisAberto, setMaisAberto] = useState(false)
  const principais = MENU.filter((m) => m.principal)
  const outros = MENU.filter((m) => !m.principal)
  const inicial = (perfil?.nome ?? '?').charAt(0).toUpperCase()

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral (PC) */}
      <aside className="bg-muted/40 sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r md:flex">
        <div className="px-4 pt-4 pb-3">
          <Logo className="h-14" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {MENU.map((m) => (
            <NavLink
              key={m.caminho}
              to={m.caminho}
              end={m.caminho === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  isActive ? 'bg-primary-soft text-primary-strong font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <m.icone className="size-4" />
              {m.titulo}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t p-3">
          <SeletorTema />
          <div className="flex items-center gap-2.5 px-1">
            <span className="bg-foreground text-background grid size-8 place-items-center rounded-full text-sm font-semibold">{inicial}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{perfil?.nome ?? '...'}</span>
            <button onClick={sair} title="Sair" className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1.5">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular) */}
        <header className="bg-background/85 sticky top-0 z-20 flex items-center justify-between border-b px-4 py-2.5 backdrop-blur md:hidden">
          <Logo className="h-10" />
          <span className="bg-foreground text-background grid size-8 place-items-center rounded-full text-sm font-semibold">{inicial}</span>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Abas de baixo (celular) */}
      <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {principais.map((m) => (
          <NavLink
            key={m.caminho}
            to={m.caminho}
            end={m.caminho === '/'}
            onClick={() => setMaisAberto(false)}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive ? 'text-primary-strong' : 'text-muted-foreground')
            }
          >
            <m.icone className="size-5" />
            {m.titulo}
          </NavLink>
        ))}
        <button
          onClick={() => setMaisAberto((v) => !v)}
          className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', maisAberto ? 'text-primary-strong' : 'text-muted-foreground')}
        >
          {maisAberto ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          Mais
        </button>
      </nav>

      {/* Painel "Mais" (celular) */}
      {maisAberto && (
        <div className="fixed inset-0 z-20 md:hidden" onClick={() => setMaisAberto(false)}>
          <div className="bg-overlay absolute inset-0" />
          <div
            className="bg-card absolute inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] space-y-3 rounded-t-2xl border-t p-3"
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
                      'flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium',
                      isActive ? 'bg-primary-soft text-primary-strong border-transparent' : 'bg-card text-foreground',
                    )
                  }
                >
                  <m.icone className="size-5" />
                  {m.titulo}
                </NavLink>
              ))}
            </div>
            <SeletorTema />
            <button onClick={sair} className="text-muted-foreground hover:bg-accent flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm">
              <LogOut className="size-4" /> Sair ({perfil?.nome})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

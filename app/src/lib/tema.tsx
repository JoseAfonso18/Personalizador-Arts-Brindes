import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type PreferenciaTema = 'sistema' | 'claro' | 'escuro'
const CHAVE = 'arts-tema'
const escuroMql = () => window.matchMedia('(prefers-color-scheme: dark)')

function lerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'escuro' ? v : 'sistema'
  } catch {
    return 'sistema'
  }
}

/** Liga/desliga a classe .dark no <html> e ajusta a cor da barra do celular. */
function aplicar(pref: PreferenciaTema) {
  const escuro = pref === 'escuro' || (pref === 'sistema' && escuroMql().matches)
  document.documentElement.classList.toggle('dark', escuro)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0a0a0a' : '#ffffff')
}

const TemaContext = createContext<{ tema: PreferenciaTema; setTema: (t: PreferenciaTema) => void } | null>(null)

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<PreferenciaTema>(lerPreferencia)

  useEffect(() => {
    aplicar(tema)
    if (tema !== 'sistema') return
    const mql = escuroMql()
    const ouvir = () => aplicar('sistema')
    mql.addEventListener('change', ouvir)
    return () => mql.removeEventListener('change', ouvir)
  }, [tema])

  function setTema(t: PreferenciaTema) {
    try {
      localStorage.setItem(CHAVE, t)
    } catch {
      /* navegador sem armazenamento: vale só até fechar */
    }
    setTemaState(t)
  }

  return <TemaContext.Provider value={{ tema, setTema }}>{children}</TemaContext.Provider>
}

export function useTema() {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema precisa estar dentro do <TemaProvider>')
  return ctx
}

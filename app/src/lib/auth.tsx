import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Perfil = { id: string; nome: string; email: string | null }

type AuthState = {
  carregando: boolean
  session: Session | null
  perfil: Perfil | null
  entrar: (email: string, senha: string) => Promise<string | null>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Guarda quem está logado e deixa disponível para todas as telas. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Busca o nome do usuário na tabela "perfis"
  useEffect(() => {
    const userId = session?.user.id
    if (!userId) return
    supabase
      .from('perfis')
      .select('id, nome, email')
      .eq('id', userId)
      .single()
      .then(({ data }) => setPerfil(data ?? { id: userId, nome: session.user.email ?? 'Usuário', email: session.user.email ?? null }))
  }, [session])

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (!error) return null
    if (error.message.includes('Invalid login')) return 'E-mail ou senha incorretos.'
    return 'Não foi possível entrar. Verifique a internet e tente de novo.'
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ carregando, session, perfil: session ? perfil : null, entrar, sair }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro do <AuthProvider>')
  return ctx
}

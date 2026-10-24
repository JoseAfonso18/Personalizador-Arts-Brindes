import { createClient } from '@supabase/supabase-js'

// As chaves vêm do arquivo .env.local (no PC) ou das variáveis da Vercel.
// Nunca coloque a chave "secret"/"service_role" aqui.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY no .env.local')
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_KEY ?? '')

/** Testa se o app alcança o Supabase com a chave configurada. */
export async function testarConexao(): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_KEY },
    })
    return r.ok
  } catch {
    return false
  }
}

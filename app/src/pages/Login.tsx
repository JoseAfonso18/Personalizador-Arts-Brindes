import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/Logo'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'

export function Login() {
  const { session, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(await entrar(email.trim(), senha))
    setEnviando(false)
  }

  return (
    <main className="fundo-pontos flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <Logo className="h-20" />
        <h1 className="text-[36px] leading-[1.1] font-medium">Entrar</h1>
        <p className="text-muted-foreground text-sm">Sistema de gestão da loja</p>
      </header>
      <Card className="shadow-ring rounded-2xl p-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && <p className="text-destructive text-sm">{erro}</p>}
          <Button type="submit" size="lg" className="mt-1" disabled={enviando}>
            {enviando && <Loader2 className="animate-spin" />} Entrar
          </Button>
        </form>
      </Card>
      <p className="text-muted-foreground text-center text-xs">Acesso só para a equipe da loja.</p>
      </div>
    </main>
  )
}

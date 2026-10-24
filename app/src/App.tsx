import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { testarConexao } from '@/lib/supabase'

type Status = 'testando' | 'ok' | 'erro'

export default function App() {
  const [banco, setBanco] = useState<Status>('testando')

  useEffect(() => {
    testarConexao().then((ok) => setBanco(ok ? 'ok' : 'erro'))
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="space-y-1">
        <p className="text-primary text-sm font-semibold tracking-widest uppercase">Art's Brindes</p>
        <h1 className="font-display text-4xl font-bold">Olá, Art's Brindes 👋</h1>
        <p className="text-muted-foreground">Sistema de gestão — em construção.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Se tudo estiver verde, o esqueleto está pronto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Linha label="App rodando" status="ok" />
          <Linha label="Banco (Supabase)" status={banco} />
        </CardContent>
      </Card>

      <Button size="lg" onClick={() => window.location.reload()}>
        Testar de novo
      </Button>
    </main>
  )
}

function Linha({ label, status }: { label: string; status: Status }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      {status === 'testando' && <Loader2 className="text-muted-foreground size-5 animate-spin" />}
      {status === 'ok' && <CheckCircle2 className="text-success size-5" />}
      {status === 'erro' && <XCircle className="text-destructive size-5" />}
    </div>
  )
}

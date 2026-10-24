import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { testarConexao } from '@/lib/supabase'

const CARTOES = [
  { titulo: 'A receber', texto: 'Sinais, fiado e vencidos' },
  { titulo: 'Em produção', texto: 'Pedidos e prazos de entrega' },
  { titulo: 'Orçamentos aguardando', texto: 'Esperando resposta do cliente' },
  { titulo: 'Estoque baixo', texto: 'Cores abaixo do mínimo' },
  { titulo: 'Resultado do mês', texto: 'Vendeu, gastou e lucrou' },
]

export function Painel() {
  const { perfil } = useAuth()
  const [banco, setBanco] = useState<'testando' | 'ok' | 'erro'>('testando')
  useEffect(() => {
    testarConexao().then((ok) => setBanco(ok ? 'ok' : 'erro'))
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Olá, {perfil?.nome ?? '...'} 👋</h1>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          Banco:
          {banco === 'testando' && <Loader2 className="size-4 animate-spin" />}
          {banco === 'ok' && (
            <span className="text-success flex items-center gap-1">
              <CheckCircle2 className="size-4" /> conectado
            </span>
          )}
          {banco === 'erro' && (
            <span className="text-destructive flex items-center gap-1">
              <XCircle className="size-4" /> sem conexão
            </span>
          )}
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CARTOES.map((c) => (
          <Card key={c.titulo} className="border-dashed">
            <CardHeader>
              <CardTitle>{c.titulo}</CardTitle>
              <CardDescription>{c.texto}</CardDescription>
            </CardHeader>
            <p className="text-muted-foreground text-xs">Em breve</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

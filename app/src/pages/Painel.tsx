import { useEffect, useState } from 'react'
import { ClipboardList, FileText, Loader2, PackageX, TrendingUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { testarConexao } from '@/lib/supabase'

const CARTOES = [
  { titulo: 'A receber', texto: 'Sinais, fiado e vencidos', Icone: Wallet, cor: 'text-success bg-success-soft' },
  { titulo: 'Em produção', texto: 'Pedidos e prazos de entrega', Icone: ClipboardList, cor: 'text-primary-strong bg-primary-soft' },
  { titulo: 'Orçamentos aguardando', texto: 'Esperando resposta do cliente', Icone: FileText, cor: 'text-foreground bg-muted' },
  { titulo: 'Estoque baixo', texto: 'Cores abaixo do mínimo', Icone: PackageX, cor: 'text-warning bg-warning-soft' },
  { titulo: 'Resultado do mês', texto: 'Vendeu, gastou e lucrou', Icone: TrendingUp, cor: 'text-foreground bg-muted' },
]

export function Painel() {
  const { perfil } = useAuth()
  const [banco, setBanco] = useState<'testando' | 'ok' | 'erro'>('testando')
  useEffect(() => {
    testarConexao().then((ok) => setBanco(ok ? 'ok' : 'erro'))
  }, [])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Painel</p>
          <h1 className="titulo-pagina">Olá, {perfil?.nome ?? '...'} 👋</h1>
        </div>
        {banco === 'testando' && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
        {banco === 'ok' && <Badge variant="sucesso">● Banco conectado</Badge>}
        {banco === 'erro' && <Badge className="bg-destructive-soft text-destructive">● Sem conexão com o banco</Badge>}
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CARTOES.map(({ titulo, texto, Icone, cor }) => (
          <Card key={titulo} className="gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`grid size-8 place-items-center rounded-lg ${cor}`}>
                <Icone className="size-4" />
              </span>
              <p className="text-sm font-medium">{titulo}</p>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-muted-foreground/60">—</p>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{texto}</p>
              <Badge variant="outline">Em breve</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

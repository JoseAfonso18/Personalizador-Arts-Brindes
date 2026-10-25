import { Construction } from 'lucide-react'
import type { ItemMenu } from '@/lib/menu'

export function EmBreve({ item }: { item: ItemMenu }) {
  return (
    <div className="space-y-6">
      <h1 className="titulo-pagina">{item.titulo}</h1>
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Construction className="text-primary size-10" />
        <p>Em construção{item.etapa ? ` — etapa ${item.etapa}` : ''}.</p>
      </div>
    </div>
  )
}

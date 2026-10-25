import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CAMINHO_PROVADOR } from '@/lib/mockup'

/** O Personalizador completo (projetos salvos no aparelho, link de prévia, medidas para o EzCad). */
export function Provador() {
  const [carregando, setCarregando] = useState(true)
  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="titulo-pagina">Provador 3D</h1>
          <p className="text-muted-foreground text-sm">Para montar o mockup de um orçamento, use “Montar mockup 3D” no item — ele fica salvo junto.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={CAMINHO_PROVADOR} target="_blank" rel="noopener">
            <ExternalLink /> Abrir em tela cheia
          </a>
        </Button>
      </header>
      <div className="relative h-[calc(100svh-15rem)] min-h-[520px] overflow-hidden rounded-2xl border bg-[#121214] md:h-[calc(100svh-11rem)]">
        {carregando && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-[#FA5B04]" />
          </div>
        )}
        <iframe src={CAMINHO_PROVADOR} title="Provador 3D" className="size-full border-0" onLoad={() => setCarregando(false)} allow="clipboard-write; web-share" />
      </div>
    </div>
  )
}

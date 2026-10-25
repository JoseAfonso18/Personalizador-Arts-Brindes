import { useEffect, useRef, useState } from 'react'
import { Box, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { lerMensagemProvador, urlProvador, type Mockup } from '@/lib/mockup'
import { cn } from '@/lib/utils'

/** Tela cheia com o provador para montar/ajustar o mockup de um item. */
export function Provador3DModal({
  titulo,
  produto,
  cor,
  texto,
  mockup,
  onSalvar,
  onFechar,
}: {
  titulo: string
  produto?: string
  cor?: string
  texto?: string
  mockup?: Mockup | null
  onSalvar: (m: Mockup) => void
  onFechar: () => void
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [carregando, setCarregando] = useState(true)
  const [src] = useState(() => urlProvador('editar', { produto, cor, texto, mockup }))

  useEffect(() => {
    function receber(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== ref.current?.contentWindow) return
      const m = lerMensagemProvador(e.data)
      if (m === 'cancelar') onFechar()
      else if (m) onSalvar(m)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('message', receber)
    window.addEventListener('keydown', esc)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('message', receber)
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = antes
    }
  }, [onSalvar, onFechar])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#121214]" role="dialog" aria-modal="true" aria-label={`Mockup 3D — ${titulo}`}>
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-white">
        <Box className="size-5 text-[#FA5B04]" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">Mockup 3D · {titulo}</p>
        <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" aria-label="Fechar" onClick={onFechar}>
          <X />
        </Button>
      </header>
      <div className="relative flex-1">
        {carregando && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-[#FA5B04]" />
          </div>
        )}
        <iframe ref={ref} src={src} title="Provador 3D" className="size-full border-0" onLoad={() => setCarregando(false)} allow="clipboard-write" />
      </div>
    </div>
  )
}

/** Só para girar e ver (link do cliente, pedido). */
export function Visualizador3D({ mockup, className }: { mockup: Mockup; className?: string }) {
  const [carregando, setCarregando] = useState(true)
  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-[#121214]', className)}>
      {carregando && (
        <div className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-7 animate-spin text-[#FA5B04]" />
        </div>
      )}
      <iframe src={urlProvador('ver', { mockup })} title={`Prévia 3D — ${mockup.titulo}`} className="size-full border-0" loading="lazy" onLoad={() => setCarregando(false)} />
    </div>
  )
}

/** Botão "Ver em 3D" que abre a prévia embaixo do item. */
export function BotaoVer3D({ mockup, aberto: inicial = false }: { mockup: Mockup; aberto?: boolean }) {
  const [aberto, setAberto] = useState(inicial)
  return (
    <div className="mt-2 space-y-2">
      <Button type="button" size="sm" variant={aberto ? 'secondary' : 'outline'} onClick={() => setAberto((a) => !a)}>
        <Box /> {aberto ? 'Fechar 3D' : 'Ver em 3D'}
      </Button>
      {aberto && (
        <>
          <Visualizador3D mockup={mockup} className="h-80 sm:h-96" />
          <p className="text-muted-foreground text-xs">Arraste para girar · pinça para zoom. Prévia ilustrativa: tamanho e posição são conferidos antes da gravação.</p>
        </>
      )}
    </div>
  )
}

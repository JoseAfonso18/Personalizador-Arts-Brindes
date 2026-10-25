import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/card'
import { ehImagem, enviarAnexo, linkAnexo, listarAnexosCliente, listarAnexosPedido, removerAnexo, tamanhoLegivel, type Anexo } from '@/lib/anexos'
import { numeroPedido } from '@/lib/orcamento'
import { cn } from '@/lib/utils'

/** Miniatura (imagens) ou ícone + abrir/baixar. */
function ItemAnexo({ a, onRemover, mostrarPedido }: { a: Anexo; onRemover?: () => Promise<void>; mostrarPedido?: boolean }) {
  const [thumb, setThumb] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    if (ehImagem(a)) linkAnexo(a).then(setThumb).catch(() => setThumb(null))
  }, [a])
  async function abrir(baixar: boolean) {
    const url = await linkAnexo(a, baixar)
    window.open(url, '_blank', 'noopener')
  }
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <button onClick={() => abrir(false)} className="bg-muted grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border" title="Abrir">
        {thumb ? <img src={thumb} alt="" className="size-full object-contain" /> : <FileText className="text-muted-foreground size-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <button onClick={() => abrir(false)} className="block max-w-full truncate text-left text-sm font-medium hover:underline">
          {a.nome}
        </button>
        <p className="text-muted-foreground text-xs">
          {tamanhoLegivel(a.tamanho)}
          {mostrarPedido && a.pedido && (
            <>
              {' · '}
              <Link to={`/pedidos/${a.pedido_id}`} className="hover:underline">
                {numeroPedido(a.pedido.numero)}
              </Link>
            </>
          )}
        </p>
      </div>
      <button onClick={() => abrir(true)} className="text-muted-foreground hover:text-foreground p-1.5" title="Baixar" aria-label={`Baixar ${a.nome}`}>
        <Download className="size-4" />
      </button>
      {onRemover &&
        (confirmar ? (
          <button
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true)
              await onRemover()
            }}
            className="bg-destructive rounded-md px-2 py-1 text-xs font-medium text-white"
          >
            Remover
          </button>
        ) : (
          <button onClick={() => setConfirmar(true)} className="text-muted-foreground hover:text-destructive p-1.5" aria-label={`Remover ${a.nome}`}>
            <Trash2 className="size-4" />
          </button>
        ))}
    </li>
  )
}

/** Arquivos do pedido: logo do cliente, SVG vetorizado, arquivo do EzCad… */
export function AnexosPedido({ pedidoId }: { pedidoId: string }) {
  const [lista, setLista] = useState<Anexo[] | null>(null)
  const [enviando, setEnviando] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const carregar = () => listarAnexosPedido(pedidoId).then(setLista).catch((e: Error) => setErro(e.message))
  useEffect(() => {
    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId])

  async function enviar(arquivos: FileList | File[]) {
    setErro(null)
    const fs = Array.from(arquivos)
    setEnviando(fs.length)
    for (const f of fs) {
      try {
        await enviarAnexo(pedidoId, f)
      } catch (e) {
        setErro((e as Error).message)
      }
      setEnviando((n) => n - 1)
    }
    await carregar()
  }

  return (
    <Card className="gap-3">
      <CardTitle className="flex items-center gap-2">
        <Paperclip className="size-4" /> Arquivos
      </CardTitle>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          if (e.dataTransfer.files.length) void enviar(e.dataTransfer.files)
        }}
        className={cn(
          'text-muted-foreground hover:border-border-strong hover:text-foreground flex flex-col items-center gap-1 rounded-xl border border-dashed px-3 py-4 text-sm transition-colors',
          arrastando && 'border-primary bg-primary-soft text-primary-strong',
        )}
      >
        {enviando > 0 ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
        {enviando > 0 ? `Enviando ${enviando}…` : 'Enviar logo, SVG, arquivo do EzCad…'}
        <span className="text-xs">Toque para escolher ou arraste aqui · até 25 MB</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void enviar(e.target.files)
          e.target.value = ''
        }}
      />
      {lista && lista.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {lista.map((a) => (
            <ItemAnexo
              key={a.id}
              a={a}
              onRemover={async () => {
                try {
                  await removerAnexo(a)
                } catch (e) {
                  setErro((e as Error).message)
                }
                await carregar()
              }}
            />
          ))}
        </ul>
      )}
      {erro && <p className="text-destructive text-sm">{erro}</p>}
    </Card>
  )
}

/** Na ficha do cliente: todos os arquivos dos pedidos dele. */
export function AnexosCliente({ clienteId }: { clienteId: string }) {
  const [lista, setLista] = useState<Anexo[] | null>(null)
  useEffect(() => {
    listarAnexosCliente(clienteId).then(setLista).catch(() => setLista([]))
  }, [clienteId])
  if (!lista || lista.length === 0) return null
  return (
    <Card className="gap-3">
      <CardTitle className="flex items-center gap-2">
        <Paperclip className="size-4" /> Arquivos dos pedidos ({lista.length})
      </CardTitle>
      <ul className="divide-y rounded-xl border">
        {lista.map((a) => (
          <ItemAnexo key={a.id} a={a} mostrarPedido />
        ))}
      </ul>
    </Card>
  )
}

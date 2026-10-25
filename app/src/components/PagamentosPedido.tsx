import { useState, type FormEvent } from 'react'
import { CalendarClock, CheckCircle2, HandCoins, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarBRL, lerValor, valorParaCampo } from '@/lib/dinheiro'
import { formatarData, hojeISO } from '@/lib/orcamento'
import { definirVencimento, excluirPagamento, FORMAS, registrarPagamento, type FormaPagamento, type Pedido } from '@/lib/pedidos'
import { cn } from '@/lib/utils'

/** Recebimentos do pedido: sinal, restante, parciais e fiado. */
export function PagamentosPedido({ p, nomes, onMudou }: { p: Pedido; nomes: Record<string, string>; onMudou: () => Promise<void> }) {
  const pago = p.pagamentos.reduce((s, g) => s + g.valor, 0)
  const saldo = Math.round((p.total - pago) * 100) / 100
  const sinalFalta = Math.max(0, Math.round((p.valor_sinal - pago) * 100) / 100)
  const quitado = saldo <= 0
  const pct = p.total > 0 ? Math.min(100, (pago / p.total) * 100) : 100
  const hoje = hojeISO()

  const [form, setForm] = useState<{ valor: string; forma: FormaPagamento; data: string } | null>(null)
  const [venc, setVenc] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [apagar, setApagar] = useState<string | null>(null)

  const abrir = (valor: number) => setForm({ valor: valorParaCampo(valor), forma: 'pix', data: hoje })

  async function executar(fn: () => Promise<unknown>) {
    setOcupado(true)
    setErro(null)
    try {
      await fn()
      await onMudou()
      return true
    } catch (e) {
      setErro((e as Error).message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function receber(e: FormEvent) {
    e.preventDefault()
    const v = lerValor(form!.valor)
    if (!v || v <= 0) return setErro('Valor inválido.')
    if (v > saldo) return setErro(`Valor maior que o saldo (${formatarBRL(saldo)}).`)
    if (await executar(() => registrarPagamento(p.id, v, form!.forma, form!.data))) setForm(null)
  }

  const cancelado = p.status === 'cancelado'
  const vencido = p.vencimento && p.vencimento < hoje

  return (
    <Card className="gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <HandCoins className="size-4" /> Pagamentos
        </CardTitle>
        {quitado ? (
          <span className="bg-success-soft text-success flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
            <CheckCircle2 className="size-3" /> Pago
          </span>
        ) : (
          <span className="text-sm">
            Falta <b>{formatarBRL(saldo)}</b>
          </span>
        )}
      </div>

      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div className={cn('h-full rounded-full transition-all', quitado ? 'bg-success' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-muted-foreground text-xs">
        Recebido {formatarBRL(pago)} de {formatarBRL(p.total)}
        {p.valor_sinal > 0 && !quitado && (sinalFalta > 0 ? ` · falta ${formatarBRL(sinalFalta)} do sinal` : ' · sinal pago')}
      </p>

      {p.pagamentos.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {p.pagamentos.map((g) => (
            <li key={g.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {formatarBRL(g.valor)} <span className="text-muted-foreground font-normal">· {FORMAS[g.forma]}</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatarData(g.data)}
                  {g.created_by && nomes[g.created_by] ? ` · ${nomes[g.created_by]}` : ''}
                </p>
              </div>
              {apagar === g.id ? (
                <Button size="sm" variant="destructive" disabled={ocupado} onClick={() => executar(() => excluirPagamento(g.id)).then(() => setApagar(null))}>
                  Apagar
                </Button>
              ) : (
                <button onClick={() => setApagar(g.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Apagar pagamento">
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Fiado */}
      {p.vencimento && !quitado && (
        <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm', vencido ? 'bg-destructive-soft text-destructive' : 'bg-primary-soft text-primary-strong')}>
          <CalendarClock className="size-4 shrink-0" />
          <span className="flex-1">
            Fiado: {formatarBRL(saldo)} {vencido ? 'venceu em' : 'vence em'} <b>{formatarData(p.vencimento)}</b>
          </span>
          <button className="text-xs underline" disabled={ocupado} onClick={() => executar(() => definirVencimento(p.id, null))}>
            Tirar
          </button>
        </div>
      )}

      {!quitado && !cancelado && !form && venc === null && (
        <div className="grid grid-cols-2 gap-2">
          {sinalFalta > 0 ? (
            <Button onClick={() => abrir(sinalFalta)}>
              <Plus /> Sinal {formatarBRL(sinalFalta)}
            </Button>
          ) : (
            <Button onClick={() => abrir(saldo)}>
              <Plus /> {pago > 0 ? 'Restante' : 'Receber'} {formatarBRL(saldo)}
            </Button>
          )}
          <Button variant="outline" onClick={() => abrir(sinalFalta > 0 ? saldo : saldo)}>
            Outro valor
          </Button>
          {!p.vencimento && p.cliente && (
            <Button
              variant="ghost"
              className="text-muted-foreground col-span-2"
              onClick={() => (p.cliente?.confianca ? setVenc(p.prazo_entrega ?? hoje) : setErro('Fiado só para cliente de confiança. Marque "Cliente de confiança" no cadastro do cliente.'))}
            >
              <ShieldCheck /> Deixar fiado (pagar depois)
            </Button>
          )}
        </div>
      )}

      {form && (
        <form onSubmit={receber} className="bg-muted/50 space-y-3 rounded-xl border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative col-span-2 sm:col-span-1">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
              <Input aria-label="Valor recebido" autoFocus inputMode="decimal" className="pl-9" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <Input aria-label="Data" type="date" className="col-span-2 sm:col-span-1" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(Object.keys(FORMAS) as FormaPagamento[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setForm({ ...form, forma: f })}
                className={cn('rounded-lg border py-2 text-xs font-medium', form.forma === f ? 'border-primary bg-primary-soft text-primary-strong' : 'bg-card')}
              >
                {FORMAS[f]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={ocupado}>
              {ocupado && <Loader2 className="animate-spin" />} Registrar recebimento
            </Button>
          </div>
        </form>
      )}

      {venc !== null && (
        <div className="bg-muted/50 space-y-3 rounded-xl border p-3">
          <p className="text-sm font-medium">Deixar fiado: quando o cliente vai pagar {formatarBRL(saldo)}?</p>
          <Input aria-label="Vencimento" type="date" min={hoje} value={venc} onChange={(e) => setVenc(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setVenc(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" disabled={ocupado || !venc} onClick={() => executar(() => definirVencimento(p.id, venc)).then((ok) => ok && setVenc(null))}>
              Confirmar fiado
            </Button>
          </div>
        </div>
      )}

      {erro && <p className="text-destructive text-sm">{erro}</p>}
    </Card>
  )
}

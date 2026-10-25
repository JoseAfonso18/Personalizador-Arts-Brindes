import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { AlertTriangle, AtSign, CalendarClock, CheckCircle2, Loader2, MapPin, MessageCircle, Phone, XCircle } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { montarTexto } from '@/lib/condicoes'
import { formatarBRL } from '@/lib/dinheiro'
import { formatarData, numeroOrcamento } from '@/lib/orcamento'
import { aprovarPublico, carregarPublico, linkWhatsApp, registrarVisualizacao, type OrcamentoPublico as Dados } from '@/lib/publico'
import { supabase } from '@/lib/supabase'

/** Página que o cliente abre pelo link, sem login. */
export function OrcamentoPublico() {
  const { token = '' } = useParams()
  const [o, setO] = useState<Dados | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const [aprovando, setAprovando] = useState(false)
  const [nome, setNome] = useState('')
  const [erroAprovar, setErroAprovar] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [acabouDeAprovar, setAcabouDeAprovar] = useState(false)

  useEffect(() => {
    carregarPublico(token)
      .then((d) => {
        setO(d)
        // Só conta como "cliente abriu" se não for alguém da loja logado
        if (d)
          supabase.auth.getSession().then(({ data }) => {
            if (!data.session) void registrarVisualizacao(token)
          })
      })
      .catch((e: Error) => setErro(e.message))
  }, [token])

  async function aprovar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErroAprovar(null)
    try {
      setO(await aprovarPublico(token, nome))
      setAprovando(false)
      setAcabouDeAprovar(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErroAprovar((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (o === undefined && !erro)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )

  if (erro || !o)
    return (
      <main className="fundo-pontos flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <Logo className="h-16" />
        <p className="text-lg font-medium">{erro ?? 'Orçamento não encontrado.'}</p>
        <p className="text-muted-foreground text-sm">Confira se o link está completo ou peça um novo para a loja.</p>
      </main>
    )

  const loja = o.loja
  const t = o.totais
  const condicoes = loja
    ? montarTexto(t.pede_sinal ? loja.texto_com_sinal : loja.texto_sem_sinal, {
        percentual: t.sinal_percentual,
        valor_sinal: t.valor_sinal,
        valor_restante: t.valor_restante,
        formas: loja.formas_pagamento,
        validade: loja.validade_dias,
      })
    : ''
  const numero = numeroOrcamento(o.numero)
  const whats = loja?.whatsapp || loja?.telefone
  const falarComLoja = (texto: string) => linkWhatsApp(whats, texto)
  const aberto = o.situacao === 'rascunho' || o.situacao === 'enviado'

  return (
    <main className="fundo-pontos min-h-dvh px-4 py-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <Logo className="h-12 md:h-14" />
          <div className="text-right">
            <p className="text-muted-foreground font-mono text-xs">{numero}</p>
            <p className="text-sm font-medium">Orçamento</p>
          </div>
        </header>

        {/* Situação */}
        {o.situacao === 'aprovado' && (
          <Card className="border-success bg-success-soft text-success flex-row items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">{acabouDeAprovar ? 'Orçamento aprovado! Obrigado.' : 'Orçamento aprovado'}</p>
              <p>
                {o.aprovado_por ? `Aprovado por ${o.aprovado_por.replace(' (pelo link)', '').replace(/ \(pela loja\)$/, '')}` : 'Aprovado'}
                {o.aprovado_em ? ` em ${formatarData(o.aprovado_em)}` : ''}.
                {t.pede_sinal ? ` Para iniciar a produção, faça a entrada de ${formatarBRL(t.valor_sinal)}.` : ''} A loja vai falar com você.
              </p>
            </div>
          </Card>
        )}
        {o.situacao === 'expirado' && (
          <Card className="border-warning bg-warning-soft text-warning flex-row items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm">
              <b>Este orçamento venceu em {formatarData(o.validade)}.</b> Os preços podem ter mudado — peça uma versão atualizada.
            </p>
          </Card>
        )}
        {o.situacao === 'recusado' && (
          <Card className="text-muted-foreground flex-row items-start gap-3">
            <XCircle className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm">Este orçamento não está mais disponível. Fale com a loja para um novo.</p>
          </Card>
        )}

        {/* Cabeçalho */}
        <Card className="shadow-ring rounded-2xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Para</p>
              <p className="text-xl font-semibold tracking-tight">{o.cliente}</p>
            </div>
            <div className="text-muted-foreground space-y-0.5 text-right text-xs">
              {aberto && (
                <p className="flex items-center justify-end gap-1">
                  <CalendarClock className="size-3.5" /> Válido até <b className="text-foreground">{formatarData(o.validade)}</b>
                </p>
              )}
              {o.prazo_entrega && (
                <p>
                  Entrega prevista: <b className="text-foreground">{formatarData(o.prazo_entrega)}</b>
                </p>
              )}
            </div>
          </div>

          {/* Itens */}
          <div className="divide-y rounded-xl border">
            {o.itens.map((i, n) => {
              const unit = i.preco_unitario + i.adicional
              return (
                <div key={n} className="flex gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.descricao}</p>
                    {i.detalhe && <p className="text-muted-foreground text-sm whitespace-pre-line">{i.detalhe}</p>}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {i.quantidade} un × {formatarBRL(unit)}
                      {i.item_do_cliente ? ' · gravação em peça sua' : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatarBRL(i.quantidade * unit)}</p>
                </div>
              )
            })}
          </div>

          {/* Totais */}
          <div className="space-y-1.5 text-sm">
            <Linha rotulo={`Subtotal (${t.quantidade} un)`} valor={formatarBRL(t.subtotal)} />
            {t.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarBRL(t.desconto)}`} classe="text-success" />}
            {t.frete > 0 && o.frete_repassado && <Linha rotulo="Frete" valor={formatarBRL(t.frete)} />}
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="font-medium">Total</span>
              <span className="text-3xl font-semibold tracking-tight">{formatarBRL(t.total)}</span>
            </div>
            {t.pede_sinal && (
              <div className="bg-primary-soft mt-2 space-y-1 rounded-lg p-3">
                <Linha rotulo={`Entrada (${String(t.sinal_percentual).replace('.', ',')}%)`} valor={formatarBRL(t.valor_sinal)} classe="text-primary-strong font-semibold" />
                <Linha rotulo="Na entrega" valor={formatarBRL(t.valor_restante)} />
              </div>
            )}
          </div>

          {condicoes && <p className="text-muted-foreground border-t pt-3 text-sm leading-relaxed">{condicoes}</p>}
          {o.observacao && <p className="bg-muted rounded-lg p-3 text-sm whitespace-pre-line">{o.observacao}</p>}
        </Card>

        {/* Aprovar */}
        {aberto && (
          <Card className="rounded-2xl">
            {!aprovando ? (
              <div className="space-y-2">
                <Button size="lg" className="h-12 w-full text-base" onClick={() => setAprovando(true)}>
                  <CheckCircle2 /> Aprovar orçamento
                </Button>
                {whats && (
                  <Button variant="outline" size="lg" className="w-full" asChild>
                    <a href={falarComLoja(`Olá! Tenho uma dúvida sobre o orçamento ${numero}.`)} target="_blank" rel="noreferrer">
                      <MessageCircle /> Tirar dúvida no WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={aprovar} className="space-y-3">
                <p className="font-medium">Confirmar aprovação</p>
                <div className="space-y-2">
                  <Label htmlFor="nome">Seu nome</Label>
                  <Input id="nome" autoFocus autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Quem está aprovando" />
                </div>
                <p className="text-muted-foreground text-xs">
                  Ao aprovar você concorda com os itens, valores e condições acima ({formatarBRL(t.total)}
                  {t.pede_sinal ? `, entrada de ${formatarBRL(t.valor_sinal)}` : ''}).
                </p>
                {erroAprovar && <p className="text-destructive text-sm">{erroAprovar}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setAprovando(false)}>
                    Voltar
                  </Button>
                  <Button type="submit" size="lg" className="flex-1" disabled={enviando || nome.trim().length < 2}>
                    {enviando && <Loader2 className="animate-spin" />} Aprovar
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
        {!aberto && whats && (
          <Button variant="outline" size="lg" className="w-full" asChild>
            <a
              href={falarComLoja(
                o.situacao === 'aprovado' ? `Olá! Aprovei o orçamento ${numero}. Como faço o pagamento da entrada?` : `Olá! Gostaria de uma versão atualizada do orçamento ${numero}.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> Falar com a loja no WhatsApp
            </a>
          </Button>
        )}

        {/* Rodapé da loja */}
        {loja && (
          <footer className="text-muted-foreground space-y-1 pt-2 pb-6 text-center text-xs">
            <p className="text-foreground font-medium">{loja.nome}</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {whats && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" /> {whats}
                </span>
              )}
              {loja.instagram && (
                <a className="flex items-center gap-1 hover:underline" href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noreferrer">
                  <AtSign className="size-3" /> @{loja.instagram}
                </a>
              )}
              {(loja.endereco || loja.cidade) && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {[loja.endereco, loja.cidade].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            {loja.cnpj && <p>CNPJ {loja.cnpj.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</p>}
          </footer>
        )}
      </div>
    </main>
  )
}

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className={classe}>{valor}</span>
    </div>
  )
}

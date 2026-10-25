import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { SeletorTema } from '@/components/SeletorTema'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { dividirSinal, montarTexto, precisaSinal, VARIAVEIS } from '@/lib/condicoes'
import { lerConfiguracoes, salvarConfiguracoes, type Configuracoes as Config } from '@/lib/configuracoes'
import { formatarBRL, lerValor, valorParaCampo } from '@/lib/dinheiro'
import { formatarCNPJ, formatarTelefone, limparCnpj } from '@/lib/documento'
import { cn } from '@/lib/utils'

type Campos = Omit<Config, 'sinal_percentual' | 'sinal_valor_minimo' | 'sinal_qtd_minima' | 'validade_dias'> & {
  sinal_percentual: string
  sinal_valor_minimo: string
  sinal_qtd_minima: string
  validade_dias: string
}

export function Configuracoes() {
  const [f, setF] = useState<Campos | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [simTotal, setSimTotal] = useState('1.250,00')
  const [simQtd, setSimQtd] = useState('25')
  const refComSinal = useRef<HTMLTextAreaElement>(null)
  const refSemSinal = useRef<HTMLTextAreaElement>(null)
  const [focoTexto, setFocoTexto] = useState<'com' | 'sem'>('com')

  useEffect(() => {
    lerConfiguracoes()
      .then((c) =>
        setF({
          ...c,
          sinal_percentual: String(c.sinal_percentual).replace('.', ','),
          sinal_valor_minimo: c.sinal_valor_minimo == null ? '' : valorParaCampo(c.sinal_valor_minimo),
          sinal_qtd_minima: c.sinal_qtd_minima == null ? '' : String(c.sinal_qtd_minima),
          validade_dias: String(c.validade_dias),
          loja_cnpj: c.loja_cnpj ? formatarCNPJ(c.loja_cnpj) : '',
        }),
      )
      .catch((e: Error) => setErro(e.message))
  }, [])

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => {
    setSalvo(false)
    setF((x) => (x ? { ...x, [k]: v } : x))
  }

  const num = useMemo(() => {
    if (!f) return null
    return {
      pct: lerValor(f.sinal_percentual),
      valorMin: f.sinal_valor_minimo.trim() ? lerValor(f.sinal_valor_minimo) : null,
      qtdMin: f.sinal_qtd_minima.trim() ? Number(f.sinal_qtd_minima) : null,
      validade: Number(f.validade_dias),
    }
  }, [f])

  const erros: string[] = []
  if (f && num) {
    if (num.pct == null || num.pct <= 0 || num.pct > 100) erros.push('O percentual do sinal deve ser entre 1 e 100.')
    if (f.sinal_valor_minimo.trim() && num.valorMin == null) erros.push('Valor mínimo inválido.')
    if (f.sinal_qtd_minima.trim() && !(num.qtdMin! >= 1)) erros.push('Quantidade mínima inválida.')
    if (!(num.validade >= 1 && num.validade <= 365)) erros.push('A validade deve ser entre 1 e 365 dias.')
    if (!f.loja_nome.trim()) erros.push('Informe o nome da loja.')
  }

  // Prévia com um orçamento de exemplo
  const previa = useMemo(() => {
    if (!f || !num || num.pct == null) return null
    const total = lerValor(simTotal) ?? 0
    const qtd = Number(simQtd) || 0
    const pede = precisaSinal(total, qtd, { sinal_percentual: num.pct, sinal_valor_minimo: num.valorMin, sinal_qtd_minima: num.qtdMin })
    const { sinal, restante } = dividirSinal(total, num.pct)
    const vars = { percentual: num.pct, valor_sinal: sinal, valor_restante: restante, formas: f.formas_pagamento, validade: num.validade || 0 }
    return { pede, texto: montarTexto(pede ? f.texto_com_sinal : f.texto_sem_sinal, vars) }
  }, [f, num, simTotal, simQtd])

  function inserirVariavel(chave: string) {
    const ref = focoTexto === 'com' ? refComSinal : refSemSinal
    const campo = focoTexto === 'com' ? 'texto_com_sinal' : 'texto_sem_sinal'
    const el = ref.current
    if (!el || !f) return
    const ini = el.selectionStart ?? el.value.length
    const fim = el.selectionEnd ?? el.value.length
    const novo = el.value.slice(0, ini) + `{${chave}}` + el.value.slice(fim)
    set(campo, novo)
    requestAnimationFrame(() => {
      el.focus()
      const pos = ini + chave.length + 2
      el.setSelectionRange(pos, pos)
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!f || !num || erros.length) return
    setSalvando(true)
    setErro(null)
    const vazio = (s: string | null) => (s && s.trim() ? s.trim() : null)
    try {
      await salvarConfiguracoes({
        ...f,
        sinal_percentual: num.pct!,
        sinal_valor_minimo: num.valorMin,
        sinal_qtd_minima: num.qtdMin,
        validade_dias: num.validade,
        formas_pagamento: f.formas_pagamento.trim(),
        loja_nome: f.loja_nome.trim(),
        loja_cnpj: f.loja_cnpj ? limparCnpj(f.loja_cnpj) || null : null,
        loja_whatsapp: vazio(f.loja_whatsapp),
        loja_telefone: vazio(f.loja_telefone),
        loja_email: vazio(f.loja_email),
        loja_instagram: vazio(f.loja_instagram),
        loja_endereco: vazio(f.loja_endereco),
        loja_cidade: vazio(f.loja_cidade),
      })
      setSalvo(true)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  if (!f)
    return erro ? (
      <p className="text-destructive">{erro}</p>
    ) : (
      <div className="flex justify-center py-16">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 pb-24 md:pb-0">
      <h1 className="titulo-pagina">Configurações</h1>

      {/* Sinal */}
      <Card>
        <CardHeader>
          <CardTitle>Sinal (entrada)</CardTitle>
          <CardDescription>O orçamento pede sinal quando a quantidade OU o valor total chegam no mínimo. Deixe vazio o critério que não quiser usar.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Percentual do sinal" htmlFor="pct">
            <Sufixo sufixo="%">
              <Input id="pct" inputMode="decimal" value={f.sinal_percentual} onChange={(e) => set('sinal_percentual', e.target.value)} />
            </Sufixo>
          </Campo>
          <Campo label="A partir de (unidades)" htmlFor="qmin">
            <Sufixo sufixo="un">
              <Input id="qmin" inputMode="numeric" placeholder="não usar" value={f.sinal_qtd_minima} onChange={(e) => set('sinal_qtd_minima', e.target.value.replace(/\D/g, ''))} />
            </Sufixo>
          </Campo>
          <Campo label="Ou a partir de (valor)" htmlFor="vmin">
            <Prefixo prefixo="R$">
              <Input id="vmin" inputMode="decimal" placeholder="não usar" value={f.sinal_valor_minimo} onChange={(e) => set('sinal_valor_minimo', e.target.value)} />
            </Prefixo>
          </Campo>
        </div>
        <p className="text-muted-foreground text-xs">Em cada orçamento ainda dá para mudar o percentual, tirar ou forçar o sinal.</p>
      </Card>

      {/* Orçamento */}
      <Card>
        <CardHeader>
          <CardTitle>Orçamento</CardTitle>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Campo label="Validade" htmlFor="val">
            <Sufixo sufixo="dias">
              <Input id="val" inputMode="numeric" value={f.validade_dias} onChange={(e) => set('validade_dias', e.target.value.replace(/\D/g, ''))} />
            </Sufixo>
          </Campo>
          <Campo label="Formas de pagamento" htmlFor="formas">
            <Input id="formas" value={f.formas_pagamento} onChange={(e) => set('formas_pagamento', e.target.value)} />
          </Campo>
        </div>
      </Card>

      {/* Textos */}
      <Card>
        <CardHeader>
          <CardTitle>Texto das condições de pagamento</CardTitle>
          <CardDescription>Vai no orçamento (link e PDF). As palavras entre chaves viram os valores de cada orçamento. Toque numa delas para inserir onde o cursor está.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-1.5">
          {VARIAVEIS.map((v) => (
            <button
              key={v.chave}
              type="button"
              title={v.descricao}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserirVariavel(v.chave)}
              className="bg-muted hover:bg-primary-soft hover:text-primary-strong rounded-full px-2.5 py-1 font-mono text-xs"
            >
              {`{${v.chave}}`}
            </button>
          ))}
        </div>
        <Campo label="Quando pede sinal" htmlFor="tcom">
          <Textarea id="tcom" ref={refComSinal} rows={4} value={f.texto_com_sinal} onFocus={() => setFocoTexto('com')} onChange={(e) => set('texto_com_sinal', e.target.value)} />
        </Campo>
        <Campo label="Quando não pede sinal" htmlFor="tsem">
          <Textarea id="tsem" ref={refSemSinal} rows={3} value={f.texto_sem_sinal} onFocus={() => setFocoTexto('sem')} onChange={(e) => set('texto_sem_sinal', e.target.value)} />
        </Campo>

        {previa && (
          <div className="bg-muted/60 space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">Prévia:</span>
              <Prefixo prefixo="R$" className="w-36">
                <Input aria-label="Total de exemplo" inputMode="decimal" value={simTotal} onChange={(e) => setSimTotal(e.target.value)} />
              </Prefixo>
              <Sufixo sufixo="un" className="w-28">
                <Input aria-label="Quantidade de exemplo" inputMode="numeric" value={simQtd} onChange={(e) => setSimQtd(e.target.value.replace(/\D/g, ''))} />
              </Sufixo>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', previa.pede ? 'bg-primary-soft text-primary-strong' : 'bg-success-soft text-success')}>
                {previa.pede ? 'pede sinal' : 'sem sinal'}
              </span>
            </div>
            <p className="bg-card rounded-lg border p-3 text-sm leading-relaxed">{previa.texto}</p>
            <p className="text-muted-foreground text-xs">Exemplo de {formatarBRL(lerValor(simTotal) ?? 0)} em {simQtd || 0} unidades.</p>
          </div>
        )}
      </Card>

      {/* Loja */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da loja</CardTitle>
          <CardDescription>Aparecem no PDF e no link do orçamento.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome" htmlFor="lnome">
            <Input id="lnome" value={f.loja_nome} onChange={(e) => set('loja_nome', e.target.value)} />
          </Campo>
          <Campo label="CNPJ" htmlFor="lcnpj">
            <Input id="lcnpj" value={f.loja_cnpj ?? ''} onChange={(e) => set('loja_cnpj', formatarCNPJ(e.target.value))} />
          </Campo>
          <Campo label="WhatsApp" htmlFor="lwhats">
            <Input id="lwhats" inputMode="tel" value={f.loja_whatsapp ?? ''} onChange={(e) => set('loja_whatsapp', formatarTelefone(e.target.value))} />
          </Campo>
          <Campo label="Telefone" htmlFor="ltel">
            <Input id="ltel" inputMode="tel" value={f.loja_telefone ?? ''} onChange={(e) => set('loja_telefone', formatarTelefone(e.target.value))} />
          </Campo>
          <Campo label="E-mail" htmlFor="lemail">
            <Input id="lemail" type="email" value={f.loja_email ?? ''} onChange={(e) => set('loja_email', e.target.value)} />
          </Campo>
          <Campo label="Instagram" htmlFor="linsta">
            <Prefixo prefixo="@">
              <Input id="linsta" value={f.loja_instagram ?? ''} onChange={(e) => set('loja_instagram', e.target.value.replace(/^@/, ''))} />
            </Prefixo>
          </Campo>
          <Campo label="Endereço" htmlFor="lend">
            <Input id="lend" value={f.loja_endereco ?? ''} onChange={(e) => set('loja_endereco', e.target.value)} />
          </Campo>
          <Campo label="Cidade" htmlFor="lcid">
            <Input id="lcid" value={f.loja_cidade ?? ''} onChange={(e) => set('loja_cidade', e.target.value)} />
          </Campo>
        </div>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>Vale só para este aparelho.</CardDescription>
        </CardHeader>
        <SeletorTema className="max-w-sm" />
      </Card>

      {erros.length > 0 && (
        <ul className="text-destructive space-y-1 text-sm">
          {erros.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      {erro && <p className="text-destructive text-sm">{erro}</p>}

      <div className="bg-background/95 fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-10 flex items-center gap-3 border-t p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        {salvo && (
          <span className="text-success flex items-center gap-1 text-sm">
            <CheckCircle2 className="size-4" /> Salvo
          </span>
        )}
        <Button type="submit" size="lg" className="flex-1 md:ml-auto md:flex-none md:px-10" disabled={salvando || erros.length > 0}>
          {salvando && <Loader2 className="animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  )
}

function Campo({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function Prefixo({ prefixo, children, className }: { prefixo: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative [&_input]:pl-9', className)}>
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-sm">{prefixo}</span>
      {children}
    </div>
  )
}

function Sufixo({ sufixo, children, className }: { sufixo: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative [&_input]:pr-11', className)}>
      {children}
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">{sufixo}</span>
    </div>
  )
}

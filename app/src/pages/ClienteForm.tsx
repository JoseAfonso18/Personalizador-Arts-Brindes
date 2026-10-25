import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Building2, CheckCircle2, Loader2, Search, ShieldCheck, Trash2, User } from 'lucide-react'
import { AnexosCliente } from '@/components/Anexos'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { buscarCliente, excluirCliente, salvarCliente, type Cliente, type TipoCliente } from '@/lib/clientes'
import { buscarCep, buscarCnpj } from '@/lib/consultas'
import {
  cnpjNumerico,
  formatarCEP,
  formatarCNPJ,
  formatarCPF,
  formatarTelefone,
  limparCnpj,
  soDigitos,
  validarCNPJ,
  validarCPF,
} from '@/lib/documento'
import { cn } from '@/lib/utils'

// Campos do formulário (tudo texto, já formatado para exibir)
type Campos = {
  tipo: TipoCliente
  nome: string
  nome_fantasia: string
  documento: string
  celular: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  confianca: boolean
  observacao: string
  ativo: boolean
}

const VAZIO: Campos = {
  tipo: 'pj',
  nome: '',
  nome_fantasia: '',
  documento: '',
  celular: '',
  telefone: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  confianca: false,
  observacao: '',
  ativo: true,
}

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

function deCliente(c: Cliente): Campos {
  const doc = c.cpf_cnpj ?? ''
  return {
    tipo: c.tipo,
    nome: c.nome,
    nome_fantasia: c.nome_fantasia ?? '',
    documento: c.tipo === 'pj' ? formatarCNPJ(doc) : formatarCPF(doc),
    celular: c.celular ?? '',
    telefone: c.telefone ?? '',
    email: c.email ?? '',
    cep: formatarCEP(c.cep ?? ''),
    logradouro: c.logradouro ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    bairro: c.bairro ?? '',
    cidade: c.cidade ?? '',
    uf: c.uf ?? '',
    confianca: c.confianca,
    observacao: c.observacao ?? '',
    ativo: c.ativo,
  }
}

const vazioParaNull = (s: string) => (s.trim() ? s.trim() : null)

export function ClienteForm() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()

  const [f, setF] = useState<Campos>(VAZIO)
  const [carregando, setCarregando] = useState(editando)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [consultaCnpj, setConsultaCnpj] = useState<{ estado: 'buscando' | 'ok' | 'erro'; msg?: string } | null>(null)
  const [consultaCep, setConsultaCep] = useState<{ estado: 'buscando' | 'ok' | 'erro'; msg?: string } | null>(null)
  const ultimoCnpj = useRef('')
  const ultimoCep = useRef('')

  useEffect(() => {
    if (!id) return
    buscarCliente(id)
      .then((c) => {
        if (!c) return setErro('Cliente não encontrado.')
        setF(deCliente(c))
        ultimoCnpj.current = c.cpf_cnpj ?? ''
        ultimoCep.current = c.cep ?? ''
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [id])

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) => setF((x) => ({ ...x, [campo]: valor }))

  const docLimpo = f.tipo === 'pj' ? limparCnpj(f.documento) : soDigitos(f.documento)
  const docValido = !docLimpo || (f.tipo === 'pj' ? validarCNPJ(docLimpo) : validarCPF(docLimpo))
  const docCompleto = docLimpo.length === (f.tipo === 'pj' ? 14 : 11)

  async function consultarCnpj(cnpj: string) {
    ultimoCnpj.current = cnpj
    setConsultaCnpj({ estado: 'buscando' })
    try {
      const d = await buscarCnpj(cnpj)
      setF((x) => ({
        ...x,
        nome: d.nome || x.nome,
        nome_fantasia: d.nome_fantasia || x.nome_fantasia,
        telefone: x.telefone || d.telefone,
        email: x.email || d.email,
        cep: d.cep ? formatarCEP(d.cep) : x.cep,
        logradouro: d.logradouro || x.logradouro,
        numero: d.numero || x.numero,
        complemento: d.complemento || x.complemento,
        bairro: d.bairro || x.bairro,
        cidade: d.cidade || x.cidade,
        uf: d.uf || x.uf,
      }))
      if (d.cep) ultimoCep.current = d.cep
      setConsultaCnpj({ estado: 'ok', msg: 'Dados preenchidos pela Receita. Confira e complete.' })
    } catch (e) {
      setConsultaCnpj({ estado: 'erro', msg: (e as Error).message })
    }
  }

  // Consulta automática quando o CNPJ fica completo e válido
  function aoDigitarDocumento(texto: string) {
    const formatado = f.tipo === 'pj' ? formatarCNPJ(texto) : formatarCPF(texto)
    set('documento', formatado)
    const limpo = f.tipo === 'pj' ? limparCnpj(texto) : soDigitos(texto)
    if (f.tipo === 'pj' && limpo.length === 14 && validarCNPJ(limpo) && cnpjNumerico(limpo) && limpo !== ultimoCnpj.current) {
      void consultarCnpj(limpo)
    }
  }

  async function aoDigitarCep(texto: string) {
    set('cep', formatarCEP(texto))
    const limpo = soDigitos(texto)
    if (limpo.length !== 8 || limpo === ultimoCep.current) return
    ultimoCep.current = limpo
    setConsultaCep({ estado: 'buscando' })
    try {
      const e = await buscarCep(limpo)
      setF((x) => ({ ...x, logradouro: e.logradouro || x.logradouro, bairro: e.bairro || x.bairro, cidade: e.cidade || x.cidade, uf: e.uf || x.uf }))
      setConsultaCep({ estado: 'ok' })
    } catch (err) {
      setConsultaCep({ estado: 'erro', msg: (err as Error).message })
    }
  }

  function trocarTipo(t: TipoCliente) {
    if (t === f.tipo) return
    setF((x) => ({ ...x, tipo: t, documento: '', nome_fantasia: t === 'pf' ? '' : x.nome_fantasia }))
    setConsultaCnpj(null)
    ultimoCnpj.current = ''
  }

  const erros = [
    ...(f.nome.trim() ? [] : [f.tipo === 'pj' ? 'Informe a razão social (ou o nome da empresa).' : 'Informe o nome.']),
    ...(docLimpo && !docValido ? [f.tipo === 'pj' ? 'CNPJ inválido.' : 'CPF inválido.'] : []),
    ...(f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim()) ? ['E-mail inválido.'] : []),
  ]

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTentouSalvar(true)
    if (erros.length) return
    setSalvando(true)
    setErro(null)
    try {
      await salvarCliente({
        id,
        tipo: f.tipo,
        nome: f.nome.trim(),
        nome_fantasia: f.tipo === 'pj' ? vazioParaNull(f.nome_fantasia) : null,
        cpf_cnpj: docLimpo || null,
        celular: vazioParaNull(f.celular),
        telefone: vazioParaNull(f.telefone),
        email: vazioParaNull(f.email.toLowerCase()),
        cep: soDigitos(f.cep).length === 8 ? soDigitos(f.cep) : null,
        logradouro: vazioParaNull(f.logradouro),
        numero: vazioParaNull(f.numero),
        complemento: vazioParaNull(f.complemento),
        bairro: vazioParaNull(f.bairro),
        cidade: vazioParaNull(f.cidade),
        uf: f.uf || null,
        confianca: f.confianca,
        observacao: vazioParaNull(f.observacao),
        ativo: f.ativo,
      })
      navigate('/clientes')
    } catch (err) {
      setErro((err as Error).message)
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!id) return
    setSalvando(true)
    try {
      await excluirCliente(id)
      navigate('/clientes')
    } catch (err) {
      setErro((err as Error).message)
      setSalvando(false)
    }
  }

  if (carregando)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 pb-24 md:pb-0">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clientes" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="titulo-pagina">{editando ? 'Editar cliente' : 'Novo cliente'}</h1>
      </header>

      {/* Tipo + identificação */}
      <Card>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['pj', 'Empresa', 'Pessoa jurídica (CNPJ)', Building2],
              ['pf', 'Pessoa', 'Pessoa física (CPF)', User],
            ] as const
          ).map(([valor, titulo, sub, Icone]) => (
            <button
              type="button"
              key={valor}
              onClick={() => trocarTipo(valor)}
              className={cn('flex items-center gap-3 rounded-lg border p-3 text-left', f.tipo === valor ? 'border-primary bg-primary-soft' : 'text-muted-foreground hover:bg-accent')}
            >
              <Icone className={cn('size-5 shrink-0', f.tipo === valor && 'text-primary-strong')} />
              <span>
                <span className={cn('block text-sm font-medium', f.tipo === valor && 'text-primary-strong')}>{titulo}</span>
                <span className="block text-xs">{sub}</span>
              </span>
            </button>
          ))}
        </div>

        <Campo label={f.tipo === 'pj' ? 'CNPJ' : 'CPF (opcional)'} htmlFor="doc">
          <div className="flex gap-2">
            <Input
              id="doc"
              inputMode={f.tipo === 'pf' ? 'numeric' : 'text'}
              autoCapitalize="characters"
              placeholder={f.tipo === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'}
              value={f.documento}
              onChange={(e) => aoDigitarDocumento(e.target.value)}
              aria-invalid={docCompleto && !docValido}
              className={cn(docCompleto && !docValido && 'border-destructive')}
            />
            {f.tipo === 'pj' && (
              <Button
                type="button"
                variant="outline"
                disabled={!docCompleto || !docValido || !cnpjNumerico(docLimpo) || consultaCnpj?.estado === 'buscando'}
                onClick={() => consultarCnpj(docLimpo)}
              >
                {consultaCnpj?.estado === 'buscando' ? <Loader2 className="animate-spin" /> : <Search />} Buscar
              </Button>
            )}
          </div>
          {docCompleto && !docValido && <p className="text-destructive text-xs">{f.tipo === 'pj' ? 'CNPJ inválido' : 'CPF inválido'} — confira os números.</p>}
          {f.tipo === 'pj' && !consultaCnpj && !docLimpo && <p className="text-muted-foreground text-xs">Digite o CNPJ que o sistema preenche nome e endereço sozinho.</p>}
          {consultaCnpj?.estado === 'ok' && (
            <p className="text-success flex items-center gap-1 text-xs">
              <CheckCircle2 className="size-3.5" /> {consultaCnpj.msg}
            </p>
          )}
          {consultaCnpj?.estado === 'erro' && <p className="text-warning text-xs">{consultaCnpj.msg}</p>}
          {f.tipo === 'pj' && docCompleto && docValido && !cnpjNumerico(docLimpo) && (
            <p className="text-muted-foreground text-xs">CNPJ alfanumérico (novo formato): preencha os dados à mão.</p>
          )}
        </Campo>

        <Campo label={f.tipo === 'pj' ? 'Razão social' : 'Nome'} htmlFor="nome">
          <Input id="nome" value={f.nome} onChange={(e) => set('nome', e.target.value)} />
        </Campo>
        {f.tipo === 'pj' && (
          <Campo label="Nome fantasia (como o cliente é conhecido)" htmlFor="fantasia">
            <Input id="fantasia" value={f.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} />
          </Campo>
        )}
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Celular / WhatsApp" htmlFor="cel">
            <Input id="cel" inputMode="tel" placeholder="(42) 99999-9999" value={f.celular} onChange={(e) => set('celular', formatarTelefone(e.target.value))} />
          </Campo>
          <Campo label="Telefone" htmlFor="tel">
            <Input id="tel" inputMode="tel" placeholder="(42) 3646-0000" value={f.telefone} onChange={(e) => set('telefone', formatarTelefone(e.target.value))} />
          </Campo>
          <Campo label="E-mail" htmlFor="email" className="sm:col-span-2">
            <Input id="email" type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </Campo>
        </div>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>Digite o CEP que a rua, o bairro e a cidade aparecem sozinhos.</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-6 gap-4">
          <Campo label="CEP" htmlFor="cep" className="col-span-3 sm:col-span-2">
            <div className="relative">
              <Input id="cep" inputMode="numeric" placeholder="85200-000" value={f.cep} onChange={(e) => aoDigitarCep(e.target.value)} />
              {consultaCep?.estado === 'buscando' && <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />}
              {consultaCep?.estado === 'ok' && <CheckCircle2 className="text-success absolute top-1/2 right-3 size-4 -translate-y-1/2" />}
            </div>
            {consultaCep?.estado === 'erro' && <p className="text-warning text-xs">{consultaCep.msg}</p>}
          </Campo>
          <Campo label="Rua" htmlFor="rua" className="col-span-6 sm:col-span-4">
            <Input id="rua" value={f.logradouro} onChange={(e) => set('logradouro', e.target.value)} />
          </Campo>
          <Campo label="Número" htmlFor="num" className="col-span-2">
            <Input id="num" value={f.numero} onChange={(e) => set('numero', e.target.value)} />
          </Campo>
          <Campo label="Complemento" htmlFor="comp" className="col-span-4">
            <Input id="comp" value={f.complemento} onChange={(e) => set('complemento', e.target.value)} />
          </Campo>
          <Campo label="Bairro" htmlFor="bairro" className="col-span-6 sm:col-span-2">
            <Input id="bairro" value={f.bairro} onChange={(e) => set('bairro', e.target.value)} />
          </Campo>
          <Campo label="Cidade" htmlFor="cidade" className="col-span-4 sm:col-span-3">
            <Input id="cidade" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} />
          </Campo>
          <Campo label="UF" htmlFor="uf" className="col-span-2 sm:col-span-1">
            <select
              id="uf"
              value={f.uf}
              onChange={(e) => set('uf', e.target.value)}
              className="border-input bg-card h-10 w-full rounded-md border px-2 text-base outline-none focus-visible:border-foreground md:h-9 md:text-sm"
            >
              <option value="">—</option>
              {UFS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Campo>
        </div>
      </Card>

      {/* Condições */}
      <Card>
        <label className={cn('flex cursor-pointer gap-3 rounded-lg border p-3', f.confianca && 'border-success bg-success-soft')}>
          <input type="checkbox" className="accent-primary mt-0.5 size-4" checked={f.confianca} onChange={(e) => set('confianca', e.target.checked)} />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldCheck className="size-4" /> Cliente de confiança
            </span>
            <span className="text-muted-foreground block text-xs">Libera venda fiado (a prazo) para este cliente nos pedidos.</span>
          </span>
        </label>
        <Campo label="Observação" htmlFor="obs">
          <Textarea id="obs" placeholder="Quem indicou, preferências, contato do responsável…" value={f.observacao} onChange={(e) => set('observacao', e.target.value)} />
        </Campo>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary size-4" checked={f.ativo} onChange={(e) => set('ativo', e.target.checked)} />
          Ativo
        </label>
      </Card>

      {id && <AnexosCliente clienteId={id} />}

      {tentouSalvar && erros.length > 0 && (
        <ul className="text-destructive space-y-1 text-sm">
          {erros.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      {erro && <p className="text-destructive text-sm">{erro}</p>}

      <div className="bg-background/95 fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-10 flex gap-2 border-t p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        {editando &&
          (confirmarExclusao ? (
            <Button type="button" variant="destructive" onClick={excluir} disabled={salvando}>
              Confirmar exclusão
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setConfirmarExclusao(true)} disabled={salvando}>
              <Trash2 /> Excluir
            </Button>
          ))}
        <Button type="submit" size="lg" className="flex-1 md:ml-auto md:flex-none md:px-10" disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  )
}

function Campo({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

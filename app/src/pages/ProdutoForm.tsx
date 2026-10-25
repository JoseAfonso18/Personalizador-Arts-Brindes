import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AlertTriangle, ArrowLeft, Calculator, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatarBRL, lerValor, valorParaCampo } from '@/lib/dinheiro'
import { conferirFaixas, precoUnitario, type Faixa } from '@/lib/preco'
import { buscarProduto, excluirProduto, salvarProduto, type Produto, type TipoProduto } from '@/lib/produtos'
import { cn } from '@/lib/utils'

// No formulário tudo é texto (o que a pessoa digita); vira número só ao salvar
type FaixaCampo = { chave: number; min: string; max: string; preco: string }
type CorCampo = { chave: number; id?: string; nome: string; acrescimo: string; estoque: string; minimo: string; ativo: boolean }

let seq = 0
const novaChave = () => ++seq

const FAIXAS_INICIAIS: FaixaCampo[] = [
  { chave: novaChave(), min: '1', max: '9', preco: '' },
  { chave: novaChave(), min: '10', max: '49', preco: '' },
  { chave: novaChave(), min: '50', max: '', preco: '' },
]

function paraFaixas(campos: FaixaCampo[]): Faixa[] {
  return campos.map((f) => ({
    qtd_min: Number(f.min),
    qtd_max: f.max.trim() === '' ? null : Number(f.max),
    preco: lerValor(f.preco) ?? NaN,
  }))
}

export function ProdutoForm() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()

  const [carregando, setCarregando] = useState(editando)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoProduto>('produto')
  const [ativo, setAtivo] = useState(true)
  const [observacao, setObservacao] = useState('')
  const [faixas, setFaixas] = useState<FaixaCampo[]>(FAIXAS_INICIAIS)
  const [cores, setCores] = useState<CorCampo[]>([])
  const [qtdSimulada, setQtdSimulada] = useState('10')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  useEffect(() => {
    if (!id) return
    buscarProduto(id)
      .then((p) => {
        if (!p) return setErro('Produto não encontrado.')
        setNome(p.nome)
        setTipo(p.tipo)
        setAtivo(p.ativo)
        setObservacao(p.observacao ?? '')
        setFaixas(p.faixas.map((f) => ({ chave: novaChave(), min: String(f.qtd_min), max: f.qtd_max == null ? '' : String(f.qtd_max), preco: valorParaCampo(f.preco) })))
        setCores(
          p.variacoes.map((v) => ({
            chave: novaChave(),
            id: v.id,
            nome: v.nome,
            acrescimo: v.acrescimo ? valorParaCampo(v.acrescimo) : '',
            estoque: String(v.estoque),
            minimo: String(v.estoque_minimo),
            ativo: v.ativo,
          })),
        )
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [id])

  const faixasNum = useMemo(() => paraFaixas(faixas), [faixas])
  const problemas = useMemo(() => conferirFaixas(faixasNum), [faixasNum])
  const errosCores = useMemo(() => {
    if (tipo !== 'produto') return []
    const lista: string[] = []
    const nomes = cores.map((c) => c.nome.trim().toLowerCase())
    if (nomes.some((n) => !n)) lista.push('Toda cor precisa de um nome.')
    if (new Set(nomes).size !== nomes.length) lista.push('Há cores com o mesmo nome.')
    cores.forEach((c) => {
      if (c.acrescimo.trim() && lerValor(c.acrescimo) == null) lista.push(`Acréscimo inválido em "${c.nome || 'cor sem nome'}".`)
    })
    return lista
  }, [cores, tipo])
  const errosGerais = [...(nome.trim() ? [] : ['Dê um nome ao produto.']), ...problemas.erros, ...errosCores]

  function atualizarFaixa(chave: number, campo: keyof Omit<FaixaCampo, 'chave'>, valor: string) {
    setFaixas((fs) => fs.map((f) => (f.chave === chave ? { ...f, [campo]: valor } : f)))
  }
  function adicionarFaixa() {
    setFaixas((fs) => {
      const ultima = fs[fs.length - 1]
      const inicio = ultima ? (ultima.max.trim() ? Number(ultima.max) + 1 : Number(ultima.min) + 10) : 1
      // se a última era "ou mais", fecha ela antes da nova
      const ajustadas = ultima && !ultima.max.trim() ? fs.map((f) => (f.chave === ultima.chave ? { ...f, max: String(inicio - 1) } : f)) : fs
      return [...ajustadas, { chave: novaChave(), min: String(inicio), max: '', preco: '' }]
    })
  }
  function atualizarCor(chave: number, campo: keyof Omit<CorCampo, 'chave' | 'id'>, valor: string | boolean) {
    setCores((cs) => cs.map((c) => (c.chave === chave ? { ...c, [campo]: valor } : c)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTentouSalvar(true)
    if (errosGerais.length) return
    setSalvando(true)
    setErro(null)
    const produto: Produto = {
      id,
      nome: nome.trim(),
      tipo,
      ativo,
      observacao: observacao.trim() || null,
      faixas: faixasNum,
      variacoes:
        tipo === 'produto'
          ? cores.map((c) => ({
              id: c.id,
              nome: c.nome.trim(),
              acrescimo: lerValor(c.acrescimo) ?? 0,
              estoque: Number(c.estoque) || 0,
              estoque_minimo: Number(c.minimo) || 0,
              ativo: c.ativo,
            }))
          : [],
    }
    try {
      await salvarProduto(produto)
      navigate('/produtos')
    } catch (err) {
      setErro((err as Error).message)
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!id) return
    setSalvando(true)
    try {
      await excluirProduto(id)
      navigate('/produtos')
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

  const qtd = Number(qtdSimulada)

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 pb-24 md:pb-0">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/produtos" aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="titulo-pagina">{editando ? 'Editar produto' : 'Novo produto'}</h1>
      </header>

      {/* Dados */}
      <Card>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" placeholder="Ex.: Copo Stanley 473 ml" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['produto', 'Produto', 'Tem cores e estoque'],
                ['servico_gravacao', 'Serviço de gravação', 'Cliente traz o item'],
              ] as const
            ).map(([valor, titulo, sub]) => (
              <button
                type="button"
                key={valor}
                onClick={() => setTipo(valor)}
                className={cn('rounded-lg border p-3 text-left', tipo === valor ? 'border-primary bg-primary-soft' : 'text-muted-foreground hover:bg-accent')}
              >
                <p className={cn('text-sm font-medium', tipo === valor && 'text-primary-strong')}>{titulo}</p>
                <p className="text-xs">{sub}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs">Observação (opcional)</Label>
          <Textarea id="obs" placeholder="Fornecedor, medidas, área de gravação…" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary size-4" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo (aparece nos orçamentos)
        </label>
      </Card>

      {/* Faixas */}
      <Card>
        <CardHeader>
          <CardTitle>Preço por quantidade</CardTitle>
          <CardDescription>Preço de cada unidade. Deixe "até" vazio na última faixa para valer "ou mais".</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          <div className="text-muted-foreground grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2 px-1 text-xs">
            <span>De (un)</span>
            <span>Até (un)</span>
            <span>Preço unitário</span>
            <span className="w-10" />
          </div>
          {faixas.map((f) => (
            <div key={f.chave} className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2">
              <Input inputMode="numeric" value={f.min} onChange={(e) => atualizarFaixa(f.chave, 'min', e.target.value.replace(/\D/g, ''))} aria-label="De" />
              <Input inputMode="numeric" placeholder="ou mais" value={f.max} onChange={(e) => atualizarFaixa(f.chave, 'max', e.target.value.replace(/\D/g, ''))} aria-label="Até" />
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">R$</span>
                <Input inputMode="decimal" className="pl-9" placeholder="0,00" value={f.preco} onChange={(e) => atualizarFaixa(f.chave, 'preco', e.target.value)} aria-label="Preço" />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setFaixas((fs) => fs.filter((x) => x.chave !== f.chave))} aria-label="Remover faixa">
                <Trash2 className="text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={adicionarFaixa}>
            <Plus /> Faixa
          </Button>
        </div>
        <Problemas erros={tentouSalvar ? problemas.erros : problemas.erros.filter((e) => e.includes('sobrepõem'))} avisos={problemas.avisos} />
      </Card>

      {/* Cores */}
      {tipo === 'produto' && (
        <Card>
          <CardHeader>
            <CardTitle>Cores</CardTitle>
            <CardDescription>Cada cor tem seu estoque. Acréscimo: valor a mais por unidade naquela cor (ex.: preto).</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {cores.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma cor. Adicione pelo menos uma para controlar o estoque.</p>}
            {cores.map((c) => (
              <div key={c.chave} className={cn('bg-muted/50 grid grid-cols-2 gap-2 rounded-xl border p-3 sm:grid-cols-[1.6fr_1fr_0.8fr_0.8fr_auto] sm:items-end', !c.ativo && 'opacity-60')}>
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label className="text-muted-foreground text-xs">Cor</Label>
                  <Input placeholder="Ex.: Preto" value={c.nome} onChange={(e) => atualizarCor(c.chave, 'nome', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Acréscimo (R$)</Label>
                  <Input inputMode="decimal" placeholder="0,00" value={c.acrescimo} onChange={(e) => atualizarCor(c.chave, 'acrescimo', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Estoque</Label>
                  <Input inputMode="numeric" value={c.estoque} onChange={(e) => atualizarCor(c.chave, 'estoque', e.target.value.replace(/[^\d-]/g, ''))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Mínimo</Label>
                  <Input inputMode="numeric" value={c.minimo} onChange={(e) => atualizarCor(c.chave, 'minimo', e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1">
                  <label className="text-muted-foreground flex items-center gap-1.5 text-xs sm:hidden">
                    <input type="checkbox" className="accent-primary" checked={c.ativo} onChange={(e) => atualizarCor(c.chave, 'ativo', e.target.checked)} />
                    Ativa
                  </label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setCores((cs) => cs.filter((x) => x.chave !== c.chave))} aria-label="Remover cor">
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCores((cs) => [...cs, { chave: novaChave(), nome: '', acrescimo: '', estoque: '0', minimo: '0', ativo: true }])}
            >
              <Plus /> Cor
            </Button>
            <Problemas erros={tentouSalvar ? errosCores : []} avisos={[]} />
          </div>
        </Card>
      )}

      {/* Simulador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="text-primary size-4" /> Simular preço
          </CardTitle>
        </CardHeader>
        <div className="flex items-center gap-2">
          <Input inputMode="numeric" className="w-28" value={qtdSimulada} onChange={(e) => setQtdSimulada(e.target.value.replace(/\D/g, ''))} aria-label="Quantidade" />
          <span className="text-muted-foreground text-sm">unidades</span>
        </div>
        <div className="divide-y rounded-lg border">
          {(tipo === 'produto' && cores.length ? cores : [{ chave: 0, nome: tipo === 'produto' ? 'Sem cor' : 'Serviço', acrescimo: '' }]).map((c) => {
            const unit = qtd > 0 ? precoUnitario(problemas.erros.length ? [] : faixasNum, qtd, lerValor(c.acrescimo) ?? 0) : null
            return (
              <div key={c.chave} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{c.nome || 'Cor sem nome'}</span>
                <span className="text-right">
                  {unit == null ? (
                    <span className="text-muted-foreground">sem preço</span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{formatarBRL(unit)} × {qtd} = </span>
                      <span className="font-semibold">{formatarBRL(unit * qtd)}</span>
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {tentouSalvar && errosGerais.length > 0 && <Problemas erros={errosGerais} avisos={[]} />}
      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {/* Ações: fixas embaixo no celular */}
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

function Problemas({ erros, avisos }: { erros: string[]; avisos: string[] }) {
  if (!erros.length && !avisos.length) return null
  return (
    <ul className="space-y-1 text-sm">
      {erros.map((e) => (
        <li key={e} className="text-destructive flex gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {e}
        </li>
      ))}
      {avisos.map((a) => (
        <li key={a} className="text-warning flex gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a}
        </li>
      ))}
    </ul>
  )
}

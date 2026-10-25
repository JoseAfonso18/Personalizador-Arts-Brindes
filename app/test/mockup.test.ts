import { describe, expect, it } from 'vitest'
import { lerMensagemProvador, lerMockup, modeloDoProduto, textoInicial, urlProvador } from '@/lib/mockup'

describe('mockup 3D', () => {
  it('escolhe o modelo pelo nome do produto', () => {
    expect(modeloDoProduto('Copo Stanley 473 ml')).toBe('copo')
    expect(modeloDoProduto('Caneca Térmica 709ml')).toBe('caneca')
    expect(modeloDoProduto('Garrafa Inox 1L')).toBe('garrafa')
    expect(modeloDoProduto('Garrafa slim 500 ml')).toBe('slim')
    expect(modeloDoProduto(null)).toBe('copo')
  })
  it('usa só a primeira linha curta como texto', () => {
    expect(textoInicial('Maria Eduarda\nlogo atrás')).toBe('Maria Eduarda')
    expect(textoInicial('x'.repeat(41))).toBeUndefined()
    expect(textoInicial('')).toBeUndefined()
  })
  it('monta a URL do provador', () => {
    expect(urlProvador('editar', { produto: 'caneca', cor: 'Preto', texto: 'Ana' })).toBe('/provador3d/index.html?embed=1&modo=editar&produto=caneca&cor=Preto&texto=Ana')
    const m = { hash: '#p=zABC', titulo: 'Copo', desc: 'logo' }
    expect(urlProvador('ver', { mockup: m, produto: 'copo' })).toBe('/provador3d/index.html?embed=1&modo=ver#p=zABC')
  })
  it('só aceita mockup e mensagens válidas', () => {
    expect(lerMockup(null)).toBeNull()
    expect(lerMockup({ hash: 'qualquer' })).toBeNull()
    expect(lerMockup({ hash: '#p=z1', titulo: 'T' })?.titulo).toBe('T')
    expect(lerMensagemProvador({ tipo: 'outro', hash: '#p=z1' })).toBeNull()
    expect(lerMensagemProvador({ tipo: 'arts-mockup-cancelar' })).toBe('cancelar')
    expect(lerMensagemProvador({ tipo: 'arts-mockup', hash: '#p=z1', titulo: 'Copo', desc: '' })).toMatchObject({ hash: '#p=z1' })
  })
})

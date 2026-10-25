import { describe, expect, it } from 'vitest'
import { formatarCEP, formatarCNPJ, formatarCPF, formatarTelefone, validarCNPJ, validarCPF } from '@/lib/documento'
import { mapearBrasilApi } from '@/lib/consultas'

describe('CPF', () => {
  it('valida dígitos verificadores', () => {
    expect(validarCPF('529.982.247-25')).toBe(true)
    expect(validarCPF('52998224724')).toBe(false)
    expect(validarCPF('111.111.111-11')).toBe(false)
    expect(validarCPF('123')).toBe(false)
  })
  it('formata enquanto digita', () => {
    expect(formatarCPF('5299822')).toBe('529.982.2')
    expect(formatarCPF('52998224725')).toBe('529.982.247-25')
  })
})

describe('CNPJ', () => {
  it('valida numérico e alfanumérico', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true)
    expect(validarCNPJ('11222333000180')).toBe(false)
    expect(validarCNPJ('00000000000000')).toBe(false)
    expect(validarCNPJ('12.ABC.345/01DE-35')).toBe(true) // exemplo oficial da Receita
    expect(validarCNPJ('12ABC34501DE36')).toBe(false)
  })
  it('formata', () => {
    expect(formatarCNPJ('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatarCNPJ('12abc34501de35')).toBe('12.ABC.345/01DE-35')
  })
})

describe('CEP e telefone', () => {
  it('formata', () => {
    expect(formatarCEP('85200000')).toBe('85200-000')
    expect(formatarTelefone('42999998888')).toBe('(42) 99999-8888')
    expect(formatarTelefone('4236461234')).toBe('(42) 3646-1234')
  })
})

describe('BrasilAPI', () => {
  it('converte a resposta em campos do formulário', () => {
    const d = mapearBrasilApi({
      razao_social: 'ARTS BRINDES LTDA',
      nome_fantasia: 'ARTS BRINDES',
      cep: '85200000',
      descricao_tipo_de_logradouro: 'RUA',
      logradouro: 'XV DE NOVEMBRO',
      numero: '100',
      complemento: 'SALA 2',
      bairro: 'CENTRO',
      municipio: 'PITANGA',
      uf: 'pr',
      ddd_telefone_1: '4236461234',
      email: 'CONTATO@X.COM',
    })
    expect(d).toEqual({
      nome: 'ARTS BRINDES LTDA',
      nome_fantasia: 'Arts Brindes',
      cep: '85200000',
      logradouro: 'Rua Xv de Novembro',
      numero: '100',
      complemento: 'Sala 2',
      bairro: 'Centro',
      cidade: 'Pitanga',
      uf: 'PR',
      telefone: '(42) 3646-1234',
      email: 'contato@x.com',
    })
  })
})

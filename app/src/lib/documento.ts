/** Regras de CPF, CNPJ (inclusive o alfanumérico novo), CEP e telefone. */

export const soDigitos = (s: string) => s.replace(/\D/g, '')
/** CNPJ alfanumérico: letras maiúsculas e números, sem pontuação */
export const limparCnpj = (s: string) => s.toUpperCase().replace(/[^0-9A-Z]/g, '')

export function validarCPF(valor: string): boolean {
  const c = soDigitos(valor)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dv = (n: number) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10])
}

/** Valida CNPJ numérico e alfanumérico (cada caractere vale código ASCII − 48). */
export function validarCNPJ(valor: string): boolean {
  const c = limparCnpj(valor)
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false
  const v = (ch: string) => ch.charCodeAt(0) - 48
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const soma = pesos.reduce((s, p, i) => s + v(c[i]) * p, 0)
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13])
}

export const cnpjNumerico = (valor: string) => /^\d{14}$/.test(limparCnpj(valor))

export function formatarCPF(v: string) {
  const d = soDigitos(v).slice(0, 11)
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function formatarCNPJ(v: string) {
  const d = limparCnpj(v).slice(0, 14)
  return d
    .replace(/^(\w{2})(\w)/, '$1.$2')
    .replace(/^(\w{2})\.(\w{3})(\w)/, '$1.$2.$3')
    .replace(/^(\w{2})\.(\w{3})\.(\w{3})(\w)/, '$1.$2.$3/$4')
    .replace(/\/(\w{4})(\d{1,2})$/, '/$1-$2')
}

export function formatarCEP(v: string) {
  return soDigitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}

export function formatarTelefone(v: string) {
  const d = soDigitos(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

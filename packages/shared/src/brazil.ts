// Validações brasileiras: UF, CPF e CNPJ (RN-CLI-03).

export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const
export type UF = (typeof UFS)[number]

export function isValidUf(value: string): value is UF {
  return (UFS as readonly string[]).includes(value)
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function checkDigit(digits: number[], weights: number[]): number {
  const sum = weights.reduce((acc, weight, i) => acc + weight * digits[i]!, 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digits = [...cpf].map(Number)
  const first = checkDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return first === digits[9] && second === digits[10]
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const digits = [...cnpj].map(Number)
  const first = checkDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return first === digits[12] && second === digits[13]
}

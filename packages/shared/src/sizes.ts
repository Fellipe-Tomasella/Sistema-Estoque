// Ordem de exibição dos tamanhos (RN-PRO-04): letras → números → desconhecidos → único.
// Desconhecidos recebem o mesmo peso; a consulta desempata pelo texto (ORDER BY size_sort, size).

const LETTER_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EG', 'EGG', 'G1', 'G2', 'G3', 'G4']
const SINGLE_SIZES = ['U', 'UN', 'UNICO', 'ÚNICO', 'TU']

const LETTER_BASE = 100
const NUMBER_BASE = 1_000
const UNKNOWN_SORT = 800_000
const SINGLE_SORT = 900_000

export function normalizeSize(size: string): string {
  return size.trim().replace(/\s+/g, ' ')
}

export function sizeSort(size: string): number {
  const key = normalizeSize(size).toUpperCase()
  const letterIndex = LETTER_SIZES.indexOf(key)
  if (letterIndex >= 0) return LETTER_BASE + letterIndex
  if (/^\d{1,3}$/.test(key)) return NUMBER_BASE + Number(key)
  if (SINGLE_SIZES.includes(key)) return SINGLE_SORT
  return UNKNOWN_SORT
}

export function compareSizes(a: string, b: string): number {
  return sizeSort(a) - sizeSort(b) || normalizeSize(a).localeCompare(normalizeSize(b), 'pt-BR')
}

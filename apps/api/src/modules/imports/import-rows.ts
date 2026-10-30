// Regras puras da importação (RN-IMP-01…04): normaliza linhas, aponta erros e agrupa em produtos.
import { normalizeSize, parseBRL } from '@estoque/shared'
import type { RawRow } from './spreadsheet-reader'

export const REQUIRED_COLUMNS = ['produto', 'cor', 'tamanho', 'preco', 'quantidade'] as const
export const OPTIONAL_COLUMNS = ['alerta_minimo', 'referencia', 'categoria', 'custo'] as const
export const MAX_ROWS = 5000

export interface ImportRow {
  line: number
  product: string
  color: string
  size: string
  priceCents: number | null
  quantity: number | null
  minStock: number | null
  reference: string | null
  category: string | null
  costCents: number | null
  errors: string[]
}

export interface ImportGroup {
  name: string
  existingProductId: string | null
  basePriceCents: number
  reference: string | null
  category: string | null
  variants: {
    line: number
    color: string
    size: string
    priceCents: number | null
    quantity: number
    minStock: number | null
    costCents: number | null
  }[]
}

export interface ExistingCatalog {
  products: { id: string; name: string; basePriceCents: number }[]
  variants: { productId: string; color: string; size: string }[]
}

const clean = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')

/** Chave sem maiúsculas nem acentos (RN-IMP-03). */
export const nameKey = (value: string) =>
  clean(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const variantKey = (color: string, size: string) => `${nameKey(color)}|${normalizeSize(size).toLowerCase()}`

function parseMoney(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null
  const text = clean(value)
  const brl = parseBRL(text)
  if (brl !== null) return brl
  return /^\d+(\.\d{1,2})?$/.test(text) ? Math.round(Number(text) * 100) : null
}

function parseQuantity(value: unknown): number | null {
  const number = typeof value === 'number' ? value : /^-?\d+$/.test(clean(value)) ? Number(clean(value)) : NaN
  return Number.isInteger(number) ? number : null
}

/** Normaliza as linhas e aponta os erros de cada uma (RN-IMP-02), inclusive linhas repetidas no arquivo. */
export function parseRows(rawRows: RawRow[]): ImportRow[] {
  const firstLineByKey = new Map<string, number>()

  return rawRows.map(({ line, cells }) => {
    const errors: string[] = []
    const product = clean(cells.produto)
    const color = clean(cells.cor)
    const size = normalizeSize(clean(cells.tamanho))
    if (!product) errors.push('Produto vazio')
    if (!color) errors.push('Cor vazia')
    if (!size) errors.push('Tamanho vazio')

    const priceCents = parseMoney(cells.preco)
    if (clean(cells.preco) === '') errors.push('Preço vazio')
    else if (priceCents === null) errors.push('Preço inválido')

    const quantity = parseQuantity(cells.quantidade)
    if (clean(cells.quantidade) === '') errors.push('Quantidade vazia')
    else if (quantity === null) errors.push('Quantidade inválida')
    else if (quantity < 0) errors.push('Quantidade negativa')

    let minStock: number | null = null
    if (clean(cells.alerta_minimo) !== '') {
      minStock = parseQuantity(cells.alerta_minimo)
      if (minStock === null || minStock < 0) errors.push('Alerta mínimo inválido')
    }
    let costCents: number | null = null
    if (clean(cells.custo) !== '') {
      costCents = parseMoney(cells.custo)
      if (costCents === null) errors.push('Custo inválido')
    }

    if (product && color && size) {
      const key = `${nameKey(product)}|${variantKey(color, size)}`
      const first = firstLineByKey.get(key)
      if (first) errors.push(`Linha repetida (mesma peça da linha ${first})`)
      else firstLineByKey.set(key, line)
    }

    return {
      line,
      product,
      color,
      size,
      priceCents,
      quantity,
      minStock,
      reference: clean(cells.referencia) || null,
      category: clean(cells.categoria) || null,
      costCents,
      errors,
    }
  })
}

/** Preço mais frequente; empate fica com o que apareceu primeiro (RN-IMP-03). */
function mostFrequent(prices: number[]): number {
  const counts = new Map<number, number>()
  for (const price of prices) counts.set(price, (counts.get(price) ?? 0) + 1)
  let best = prices[0]!
  for (const [price, total] of counts) if (total > counts.get(best)!) best = price
  return best
}

/**
 * Agrupa as linhas válidas por produto. Produto existente recebe as novas variações;
 * variação que já existe vira erro na linha, para não contar estoque duas vezes (RN-IMP-04).
 */
export function buildPlan(rows: ImportRow[], catalog: ExistingCatalog) {
  const existingByName = new Map<string, ExistingCatalog['products'][number]>()
  for (const product of catalog.products) {
    if (!existingByName.has(nameKey(product.name))) existingByName.set(nameKey(product.name), product)
  }
  const existingVariants = new Set(catalog.variants.map((v) => `${v.productId}|${variantKey(v.color, v.size)}`))

  const byName = Map.groupBy(
    rows.filter((row) => row.errors.length === 0),
    (row) => nameKey(row.product),
  )
  const groups: ImportGroup[] = []
  const conflicts: { line: number; message: string }[] = []

  for (const [key, groupRows] of byName) {
    const existing = existingByName.get(key)
    const existingProductId = existing?.id ?? null
    const valid = groupRows.filter((row) => {
      if (existingProductId && existingVariants.has(`${existingProductId}|${variantKey(row.color, row.size)}`)) {
        conflicts.push({ line: row.line, message: 'Variação já cadastrada — use entrada ou acerto' })
        return false
      }
      return true
    })
    if (valid.length === 0) continue

    const basePriceCents = existing?.basePriceCents ?? mostFrequent(valid.map((r) => r.priceCents!))
    groups.push({
      name: valid[0]!.product,
      existingProductId,
      basePriceCents,
      reference: valid.find((r) => r.reference)?.reference ?? null,
      category: valid.find((r) => r.category)?.category ?? null,
      variants: valid.map((row) => ({
        line: row.line,
        color: row.color,
        size: row.size,
        priceCents: row.priceCents === basePriceCents ? null : row.priceCents,
        quantity: row.quantity!,
        minStock: row.minStock,
        costCents: row.costCents,
      })),
    })
  }
  return { groups, conflicts }
}

export function summarize(groups: ImportGroup[], errorRows: number, totalRows: number) {
  const variants = groups.flatMap((g) => g.variants)
  return {
    totalRows,
    errorRows,
    productsToCreate: groups.filter((g) => !g.existingProductId).length,
    productsToUpdate: groups.filter((g) => g.existingProductId).length,
    variants: variants.length,
    units: variants.reduce((sum, v) => sum + v.quantity, 0),
  }
}

// Dinheiro sempre em centavos inteiros. Formatação só na borda (UI/PDF).

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** "1.234,56" | "R$ 10" | "10,5" → centavos. Retorna null se o texto não for um valor válido. */
export function parseBRL(input: string): number | null {
  const text = input.replace(/R\$/i, '').replace(/\s/g, '')
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(text)) return null
  const [reais = '0', cents = ''] = text.replace(/\./g, '').split(',')
  return Number(reais) * 100 + Number(cents.padEnd(2, '0'))
}

/** 123456 → "R$ 1.234,56" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/\s/g, ' ') // Intl usa espaço não separável depois do "R$"
}

/** Percentual em pontos-base (1050 = 10,50%) aplicado a um valor; arredonda meio para cima. */
export function percentOf(cents: number, basisPoints: number): number {
  return Math.floor((cents * basisPoints + 5000) / 10000)
}

/**
 * Rateia o desconto entre as linhas proporcionalmente ao subtotal de cada uma.
 * Os centavos que sobram do arredondamento para baixo vão, um a um, para as linhas com maior resto
 * (empate: maior subtotal, depois a primeira). Determinístico, e nenhuma linha recebe mais que o seu subtotal.
 */
export function allocateDiscount(lineSubtotals: number[], discountCents: number): number[] {
  const total = lineSubtotals.reduce((sum, value) => sum + value, 0)
  if (discountCents < 0 || discountCents > total) throw new RangeError('Desconto fora do intervalo do subtotal')
  if (total === 0 || discountCents === 0) return lineSubtotals.map(() => 0)

  const shares = lineSubtotals.map((subtotal, index) => {
    const exact = subtotal * discountCents
    return { index, subtotal, value: Math.floor(exact / total), remainder: exact % total }
  })
  let leftover = discountCents - shares.reduce((sum, share) => sum + share.value, 0)
  const byPriority = [...shares].sort(
    (a, b) => b.remainder - a.remainder || b.subtotal - a.subtotal || a.index - b.index,
  )
  for (const share of byPriority) {
    if (leftover === 0) break
    share.value += 1
    leftover -= 1
  }
  return shares.map((share) => share.value)
}

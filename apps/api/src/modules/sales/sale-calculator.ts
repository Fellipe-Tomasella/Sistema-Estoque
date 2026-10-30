// Regras puras do carrinho: totais, desconto (RN-VEN-04), pagamentos e fiado (RN-PAG), avisos e bloqueios (RN-VEN-06).
import { type DiscountKind, formatBRL, percentOf } from '@estoque/shared'
import type { DraftPayment } from '../../db/schema'

export interface CartLine {
  variantId: string
  productName: string
  variantLabel: string
  unitPriceCents: number
  quantity: number
  availableQty: number
  /** Produto e variação ativos. */
  sellable: boolean
}

export interface CartInput {
  lines: CartLine[]
  discountKind: DiscountKind
  discountValue: number
  payments: DraftPayment[]
  fiado: boolean
  customerId: string | null
}

const units = (n: number) => `${n} ${n === 1 ? 'unidade' : 'unidades'}`
export const lineName = (line: Pick<CartLine, 'productName' | 'variantLabel'>) =>
  `${line.productName} ${line.variantLabel.replace(' / ', '/')}`

export function discountCents(subtotalCents: number, kind: DiscountKind, value: number): number {
  if (kind === 'amount') return value
  if (kind === 'percent') return percentOf(subtotalCents, value)
  return 0
}

export function calculateCart(input: CartInput) {
  const warnings: string[] = []
  const blockers: string[] = []

  const lines = input.lines.map((line) => {
    const lineSubtotalCents = line.unitPriceCents * line.quantity
    if (!line.sellable) blockers.push(`${lineName(line)} não está mais à venda.`)
    else if (line.quantity > line.availableQty) {
      warnings.push(`Só há ${units(line.availableQty)} de ${lineName(line)} (no carrinho: ${line.quantity}).`)
    }
    return { ...line, lineSubtotalCents }
  })
  if (lines.length === 0) blockers.push('Adicione pelo menos uma peça.')

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineSubtotalCents, 0)
  const requestedDiscount = discountCents(subtotalCents, input.discountKind, input.discountValue)
  if (requestedDiscount > subtotalCents) blockers.push('O desconto passa do valor das peças.')
  const discount = Math.min(requestedDiscount, subtotalCents)
  const totalCents = subtotalCents - discount

  const payments = input.payments.map((payment) => {
    if (payment.method === 'pix' && !payment.confirmed) blockers.push('Confirme que o Pix foi recebido.')
    if (payment.method === 'card' && !payment.confirmed)
      blockers.push('Confirme que o cartão foi aprovado na maquininha.')
    const given = payment.method === 'cash' ? (payment.cashGivenCents ?? null) : null
    if (given !== null && given < payment.amountCents)
      warnings.push('O valor entregue em dinheiro é menor que o pagamento.')
    return {
      ...payment,
      changeCents: given !== null && given >= payment.amountCents ? given - payment.amountCents : null,
    }
  })
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0)
  const remainingCents = totalCents - paidCents
  const fiadoCents = input.fiado ? Math.max(0, remainingCents) : 0

  if (remainingCents < 0) blockers.push('Os pagamentos passam do total da venda.')
  if (remainingCents > 0 && !input.fiado) blockers.push(`Faltam ${formatBRL(remainingCents)} para fechar o pagamento.`)
  if (fiadoCents > 0 && !input.customerId) blockers.push('Para deixar valor no fiado, escolha a cliente.')

  return {
    lines,
    subtotalCents,
    discountCents: discount,
    totalCents,
    payments,
    paidCents,
    fiadoCents,
    warnings,
    blockers: [...new Set(blockers)],
  }
}
export type CartResult = ReturnType<typeof calculateCart>

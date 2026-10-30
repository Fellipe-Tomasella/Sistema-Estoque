// Valor das peças que voltam e para onde ele vai (RN-CAN-05, RN-DEV-02/04). Regras puras.
import { proportionalValue } from '@estoque/shared'
import type { SaleItem } from '../../db/schema'

export interface ReturningItem {
  saleItem: SaleItem
  quantity: number
}

/** Valor de cada peça devolvida: parte proporcional do total da linha (já com o desconto rateado). */
export function valueReturning(items: ReturningItem[]) {
  const lines = items.map(({ saleItem, quantity }) => ({
    saleItem,
    quantity,
    valueCents: proportionalValue(saleItem.lineTotalCents, saleItem.quantity, saleItem.returnedQty, quantity),
  }))
  return { lines, totalCents: lines.reduce((sum, line) => sum + line.valueCents, 0) }
}

/** O valor primeiro abate o fiado em aberto da venda; o que sobra é devolvido (ou vira crédito na troca). */
export function splitAgainstDebt(valueCents: number, openDebtCents: number) {
  const appliedToReceivableCents = Math.min(valueCents, openDebtCents)
  return { appliedToReceivableCents, restCents: valueCents - appliedToReceivableCents }
}

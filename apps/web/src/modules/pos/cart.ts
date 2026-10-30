import { percentOf } from '@estoque/shared'
import type { Variant, VariantSearchResult } from '@/modules/products/types'
import type { DraftState } from './composables/useSaleDraft'

type Sellable = Pick<Variant, 'id' | 'label' | 'effectivePriceCents' | 'stockQty'>

/** Mesma peça de novo soma na linha que já existe (RN-VEN-02). */
export function addItem(state: DraftState, productName: string, variant: Sellable, quantity = 1) {
  const line = state.items.find((i) => i.variantId === variant.id)
  if (line) return void (line.quantity += quantity)
  state.items.push({
    variantId: variant.id,
    productName,
    variantLabel: variant.label,
    unitPriceCents: variant.effectivePriceCents,
    quantity,
    availableQty: variant.stockQty,
  })
}

export const addSearchResult = (state: DraftState, variant: VariantSearchResult) =>
  addItem(state, variant.productName, variant)

/** Total com desconto calculado na hora (o servidor confirma ao salvar), para sugerir o valor do pagamento. */
export function totalOf(state: DraftState) {
  const subtotal = state.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0)
  const { kind, value } = state.discount
  const discount = kind === 'amount' ? value : kind === 'percent' ? percentOf(subtotal, value) : 0
  return Math.max(0, subtotal - discount)
}

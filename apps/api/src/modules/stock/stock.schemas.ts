import { ADJUSTMENT_REASONS, STOCK_MOVEMENT_TYPES } from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const DateString = t.String({ format: 'date' })
const Page = {
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 200, default: 50 })),
}

export const CreateEntryBody = t.Object({
  entryDate: DateString,
  supplierName: t.Optional(t.Nullable(t.String({ maxLength: 120 }))),
  reference: t.Optional(t.Nullable(t.String({ maxLength: 60 }))),
  notes: t.Optional(t.Nullable(t.String({ maxLength: 1000 }))),
  items: t.Array(
    t.Object({
      variantId: t.String({ format: 'uuid' }),
      quantity: t.Integer({ minimum: 1, maximum: 1_000_000 }),
      unitCostCents: t.Optional(t.Nullable(t.Integer({ minimum: 0, maximum: 100_000_000 }))),
    }),
    { minItems: 1, maxItems: 500 },
  ),
  /** Entrada que veio do XML da NF-e (RN-EST-11): chave da nota e vínculos a lembrar. */
  nfe: t.Optional(
    t.Object({
      accessKey: t.Nullable(t.String({ pattern: '^[0-9]{44}$' })),
      supplierDocument: t.String({ maxLength: 14 }),
      links: t.Array(
        t.Object({ supplierCode: t.String({ minLength: 1, maxLength: 60 }), variantId: t.String({ format: 'uuid' }) }),
        { maxItems: 500 },
      ),
    }),
  ),
})
export type CreateEntryInput = typeof CreateEntryBody.static

export const ListEntriesQuery = t.Object({ from: t.Optional(DateString), to: t.Optional(DateString), ...Page })

export const CreateAdjustmentBody = t.Object({
  variantId: t.String({ format: 'uuid' }),
  reason: OneOf(ADJUSTMENT_REASONS),
  /** Só para `count`: quanto a dona contou. */
  countedQty: t.Optional(t.Integer({ minimum: 0, maximum: 1_000_000 })),
  /** Para os demais motivos: quanto tirar (negativo) ou acrescentar (positivo). */
  quantityDelta: t.Optional(t.Integer({ minimum: -1_000_000, maximum: 1_000_000 })),
  note: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
})
export type CreateAdjustmentInput = typeof CreateAdjustmentBody.static

export const ListMovementsQuery = t.Object({
  type: t.Optional(OneOf(STOCK_MOVEMENT_TYPES)),
  from: t.Optional(DateString),
  to: t.Optional(DateString),
  ...Page,
})
export type ListMovementsInput = typeof ListMovementsQuery.static

export const IdParams = t.Object({ id: t.String({ format: 'uuid' }) })

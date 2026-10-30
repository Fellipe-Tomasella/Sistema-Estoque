import { CARD_TYPES, MONEY_METHODS } from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const Uuid = t.String({ format: 'uuid' })
const Cents = t.Integer({ minimum: 1, maximum: 100_000_000 })
const AllocationsBody = t.Array(t.Object({ receivableId: Uuid, amountCents: Cents }), { maxItems: 200 })

export const ReceiptPreviewBody = t.Object({
  customerId: Uuid,
  amountCents: Cents,
  /** Sem distribuição: o sistema sugere das dívidas mais antigas para as mais novas. */
  allocations: t.Optional(AllocationsBody),
})
export type ReceiptPreviewInput = typeof ReceiptPreviewBody.static

export const CreateReceiptBody = t.Object({
  customerId: Uuid,
  date: t.Optional(t.String({ format: 'date' })),
  method: OneOf(MONEY_METHODS),
  cardType: t.Optional(t.Nullable(OneOf(CARD_TYPES))),
  amountCents: Cents,
  allocations: AllocationsBody,
  notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
})
export type CreateReceiptInput = typeof CreateReceiptBody.static

export const VoidReceiptBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 500 }) })
export const DueDateBody = t.Object({ dueDate: t.Nullable(t.String({ format: 'date' })) })
export const IdParams = t.Object({ id: Uuid })

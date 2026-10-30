import { ITEM_CONDITIONS, MONEY_METHODS, REFUND_STATUSES } from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'
import { DraftPaymentBody } from '../sales/sales.schemas'

const Uuid = t.String({ format: 'uuid' })

export const CancelPreviewQuery = t.Object({ itemsWithStore: t.Optional(t.Boolean()) })
export const CancelBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 500 }), itemsWithStore: t.Boolean() })

export const ReceiveItemParams = t.Object({ id: Uuid, itemId: Uuid })
export const ReceiveItemBody = t.Object({ condition: OneOf(ITEM_CONDITIONS) })

export const RefundsQuery = t.Object({ status: t.Optional(OneOf(REFUND_STATUSES)) })
export const RefundDoneBody = t.Object({ method: OneOf(MONEY_METHODS), date: t.Optional(t.String({ format: 'date' })) })
export const ReasonBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 500 }) })

export const IdParams = t.Object({ id: Uuid })

export const ReturnRequestBody = t.Object({
  items: t.Array(
    t.Object({
      saleItemId: Uuid,
      quantity: t.Integer({ minimum: 1, maximum: 10_000 }),
      /** true = a peça chegou agora (informar a condição); false = ainda com a cliente. */
      received: t.Boolean(),
      condition: t.Optional(OneOf(ITEM_CONDITIONS)),
    }),
    { minItems: 1, maxItems: 200 },
  ),
  reason: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  /** Troca: peças entregues no lugar e como pagar a diferença. */
  exchange: t.Optional(
    t.Object({
      items: t.Array(t.Object({ variantId: Uuid, quantity: t.Integer({ minimum: 1, maximum: 10_000 }) }), {
        minItems: 1,
        maxItems: 200,
      }),
      payments: t.Array(DraftPaymentBody, { maxItems: 10 }),
      fiado: t.Optional(t.Boolean()),
      fiadoDueDate: t.Optional(t.Nullable(t.String({ format: 'date' }))),
    }),
  ),
})
export type ReturnRequestInput = typeof ReturnRequestBody.static

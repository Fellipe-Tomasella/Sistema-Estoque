import { ITEM_CONDITIONS, MONEY_METHODS, REFUND_STATUSES } from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const Uuid = t.String({ format: 'uuid' })

export const CancelPreviewQuery = t.Object({ itemsWithStore: t.Optional(t.Boolean()) })
export const CancelBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 500 }), itemsWithStore: t.Boolean() })

export const ReceiveItemParams = t.Object({ id: Uuid, itemId: Uuid })
export const ReceiveItemBody = t.Object({ condition: OneOf(ITEM_CONDITIONS) })

export const RefundsQuery = t.Object({ status: t.Optional(OneOf(REFUND_STATUSES)) })
export const RefundDoneBody = t.Object({ method: OneOf(MONEY_METHODS), date: t.Optional(t.String({ format: 'date' })) })
export const ReasonBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 500 }) })

export const IdParams = t.Object({ id: Uuid })

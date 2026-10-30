import {
  CARD_TYPES,
  DISCOUNT_KINDS,
  MONEY_METHODS,
  PAYMENT_STATUSES_OF_SALE,
  SALE_STATUSES,
  SHIPPING_STATUSES,
} from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'
import { AddressBody } from '../customers/customers.schemas'

const Uuid = t.String({ format: 'uuid' })
const DateString = t.String({ format: 'date' })
const Cents = t.Integer({ minimum: 0, maximum: 100_000_000 })

export const DraftPaymentBody = t.Object({
  id: Uuid,
  method: OneOf(MONEY_METHODS),
  amountCents: t.Integer({ minimum: 1, maximum: 100_000_000 }),
  confirmed: t.Boolean(),
  cardType: t.Optional(t.Nullable(OneOf(CARD_TYPES))),
  installments: t.Optional(t.Nullable(t.Integer({ minimum: 1, maximum: 24 }))),
  cashGivenCents: t.Optional(t.Nullable(Cents)),
})

export const ShippingBody = t.Object({
  enabled: t.Boolean(),
  address: t.Optional(t.Nullable(AddressBody)),
  uf: t.Optional(t.Nullable(t.String({ maxLength: 2 }))),
  trackingCode: t.Optional(t.Nullable(t.String({ maxLength: 60 }))),
})

/** Edição do rascunho: só os campos enviados mudam; `items` e `payments` substituem a lista inteira. */
export const UpdateDraftBody = t.Object({
  version: t.Integer({ minimum: 1 }),
  items: t.Optional(
    t.Array(t.Object({ variantId: Uuid, quantity: t.Integer({ minimum: 1, maximum: 10_000 }) }), { maxItems: 200 }),
  ),
  customerId: t.Optional(t.Nullable(Uuid)),
  discount: t.Optional(
    t.Object({
      kind: OneOf(DISCOUNT_KINDS),
      /** Centavos (amount) ou pontos-base (percent: 1050 = 10,50%). */
      value: t.Integer({ minimum: 0, maximum: 100_000_000 }),
    }),
  ),
  payments: t.Optional(t.Array(DraftPaymentBody, { maxItems: 10 })),
  fiado: t.Optional(t.Boolean()),
  fiadoDueDate: t.Optional(t.Nullable(DateString)),
  shipping: t.Optional(ShippingBody),
  notes: t.Optional(t.Nullable(t.String({ maxLength: 1000 }))),
  fiscalRequested: t.Optional(t.Boolean()),
})
export type UpdateDraftInput = typeof UpdateDraftBody.static

export const ListSalesQuery = t.Object({
  from: t.Optional(DateString),
  to: t.Optional(DateString),
  customerId: t.Optional(Uuid),
  status: t.Optional(OneOf(SALE_STATUSES)),
  paymentStatus: t.Optional(OneOf(PAYMENT_STATUSES_OF_SALE)),
  shippingStatus: t.Optional(OneOf(SHIPPING_STATUSES)),
  method: t.Optional(OneOf(MONEY_METHODS)),
  number: t.Optional(t.Integer({ minimum: 1 })),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 200, default: 50 })),
})
export type ListSalesFilters = typeof ListSalesQuery.static

export const UpdateShippingBody = t.Object({
  status: OneOf(SHIPPING_STATUSES),
  trackingCode: t.Optional(t.Nullable(t.String({ maxLength: 60 }))),
  address: t.Optional(t.Nullable(AddressBody)),
  uf: t.Optional(t.Nullable(t.String({ maxLength: 2 }))),
})
export type UpdateShippingInput = typeof UpdateShippingBody.static

export const ChangePaymentMethodBody = t.Object({
  method: OneOf(MONEY_METHODS),
  cardType: t.Optional(t.Nullable(OneOf(CARD_TYPES))),
  reason: t.String({ minLength: 1, maxLength: 500 }),
})
export type ChangePaymentMethodInput = typeof ChangePaymentMethodBody.static

export const NotesBody = t.Object({ notes: t.Nullable(t.String({ maxLength: 1000 })) })
export const IdParams = t.Object({ id: Uuid })
export const PaymentParams = t.Object({ id: Uuid, paymentId: Uuid })

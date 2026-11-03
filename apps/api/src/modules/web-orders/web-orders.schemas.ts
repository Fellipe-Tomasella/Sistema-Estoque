import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const OptionalText = (maxLength: number) => t.Optional(t.Nullable(t.String({ maxLength })))

/** Envio do site (sem login). `website` é o campo isca: gente não vê, robô preenche. */
export const CreateWebOrderBody = t.Object({
  items: t.Array(
    t.Object({ variantId: t.String({ format: 'uuid' }), quantity: t.Integer({ minimum: 1, maximum: 20 }) }),
    { minItems: 1, maxItems: 30 },
  ),
  name: t.String({ minLength: 2, maxLength: 120 }),
  whatsapp: t.String({ minLength: 8, maxLength: 30 }),
  email: OptionalText(200),
  city: OptionalText(100),
  notes: OptionalText(1000),
  consent: t.Boolean(),
  website: t.Optional(t.String({ maxLength: 200 })),
})
export type CreateWebOrderInput = typeof CreateWebOrderBody.static

export const ListWebOrdersQuery = t.Object({ status: t.Optional(OneOf(['open', 'closed'])) })

export const WebOrderStatusBody = t.Object({
  // “convertido” só pelo botão Virar venda
  status: OneOf(['new', 'contacted', 'declined']),
  reason: OptionalText(300),
})
export type WebOrderStatusInput = typeof WebOrderStatusBody.static

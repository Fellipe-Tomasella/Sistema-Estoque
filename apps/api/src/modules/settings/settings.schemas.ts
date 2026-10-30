import { TAX_REGIMES } from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const nullableText = (maxLength = 200) => t.Optional(t.Nullable(t.String({ maxLength })))

export const UpdateStoreSettingsBody = t.Object({
  storeName: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  legalName: nullableText(),
  cnpj: nullableText(20),
  stateRegistration: nullableText(30),
  uf: nullableText(2),
  city: nullableText(120),
  address: nullableText(300),
  phone: nullableText(30),
  email: t.Optional(t.Nullable(t.String({ format: 'email', maxLength: 200 }))),
  timezone: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  taxRegime: t.Optional(OneOf(TAX_REGIMES)),
  receiptFooter: nullableText(500),
  fiscalRulesValidated: t.Optional(t.Boolean()),
})
export type UpdateStoreSettingsInput = typeof UpdateStoreSettingsBody.static

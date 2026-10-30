import { FISCAL_DOC_TYPES } from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const DateString = t.String({ format: 'date' })

export const RegisterDocumentBody = t.Object({
  docType: OneOf(FISCAL_DOC_TYPES),
  number: t.String({ minLength: 1, maxLength: 20 }),
  series: t.Optional(t.Nullable(t.String({ maxLength: 10 }))),
  accessKey: t.Optional(t.Nullable(t.String({ maxLength: 60 }))),
  issuedAt: DateString,
  notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
})
export type RegisterDocumentInput = typeof RegisterDocumentBody.static

/** Corrigir dados da nota ou registrar que foi cancelada no emissor (`cancelled: true` + data). */
export const UpdateDocumentBody = t.Object({
  docType: t.Optional(OneOf(FISCAL_DOC_TYPES)),
  number: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
  series: t.Optional(t.Nullable(t.String({ maxLength: 10 }))),
  accessKey: t.Optional(t.Nullable(t.String({ maxLength: 60 }))),
  issuedAt: t.Optional(DateString),
  notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  cancelled: t.Optional(t.Boolean()),
  cancelledAt: t.Optional(DateString),
})
export type UpdateDocumentInput = typeof UpdateDocumentBody.static

export const IdParams = t.Object({ id: t.String({ format: 'uuid' }) })

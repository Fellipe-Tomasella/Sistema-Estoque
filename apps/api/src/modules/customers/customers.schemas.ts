import { DOCUMENT_TYPES } from '@estoque/shared'
import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const OptionalText = (maxLength: number) => t.Optional(t.Nullable(t.String({ maxLength })))

export const AddressBody = t.Object({
  zip: OptionalText(10),
  street: OptionalText(200),
  number: OptionalText(20),
  complement: OptionalText(100),
  district: OptionalText(100),
  city: OptionalText(100),
  uf: OptionalText(2),
})

const CustomerFields = {
  phone: OptionalText(30),
  email: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
  notes: OptionalText(1000),
  /** Opcional: deduzido pela quantidade de dígitos quando não informado. */
  documentType: t.Optional(t.Nullable(OneOf(DOCUMENT_TYPES))),
  document: OptionalText(20),
  address: t.Optional(t.Nullable(AddressBody)),
}

export const CreateCustomerBody = t.Object({ name: t.String({ minLength: 1, maxLength: 120 }), ...CustomerFields })
export type CreateCustomerInput = typeof CreateCustomerBody.static

export const UpdateCustomerBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  ...CustomerFields,
})
export type UpdateCustomerInput = typeof UpdateCustomerBody.static

export const ListCustomersQuery = t.Object({
  q: t.Optional(t.String({ maxLength: 100 })),
  status: t.Optional(OneOf(['active', 'inactive', 'all'])),
  /** Só clientes com saldo em aberto no fiado. */
  withOpenBalance: t.Optional(t.Boolean()),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 200, default: 50 })),
})
export type ListCustomersFilters = typeof ListCustomersQuery.static

export const IdParams = t.Object({ id: t.String({ format: 'uuid' }) })

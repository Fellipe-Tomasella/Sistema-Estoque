import { DOCUMENT_TYPES } from '@estoque/shared'
import { sql } from 'drizzle-orm'
import { boolean, index, jsonb, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from './columns'

export const documentType = pgEnum('document_type', DOCUMENT_TYPES)

export interface Address {
  zip?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  district?: string | null
  city?: string | null
  uf?: string | null
}

/** Homônimos são permitidos (RN-CLI-02): dívidas ficam sempre ligadas ao id, nunca ao nome. */
export const customers = pgTable(
  'customers',
  {
    id: id(),
    name: text().notNull(),
    phone: text(),
    email: text(),
    notes: text(),
    documentType: documentType(),
    /** Só dígitos. */
    document: text(),
    address: jsonb().$type<Address>(),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('customers_document_uq')
      .on(table.document)
      .where(sql`${table.document} is not null`),
    index('customers_name_search_idx').using('gin', sql`immutable_unaccent(lower(${table.name})) gin_trgm_ops`),
  ],
)

export type Customer = typeof customers.$inferSelect

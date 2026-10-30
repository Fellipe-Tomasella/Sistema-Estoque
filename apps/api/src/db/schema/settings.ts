import { TAX_REGIMES } from '@estoque/shared'
import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgEnum, pgTable, text } from 'drizzle-orm/pg-core'
import { updatedAt } from './columns'

export const taxRegime = pgEnum('tax_regime', TAX_REGIMES)

/** Linha única (id = 1) com os dados da loja. */
export const storeSettings = pgTable(
  'store_settings',
  {
    id: integer().primaryKey().default(1),
    storeName: text().notNull().default('Minha loja'),
    legalName: text(),
    cnpj: text(),
    stateRegistration: text(),
    uf: text(),
    city: text(),
    address: text(),
    phone: text(),
    email: text(),
    timezone: text().notNull().default('America/Sao_Paulo'),
    taxRegime: taxRegime().notNull().default('mei'),
    receiptFooter: text(),
    fiscalRulesValidated: boolean().notNull().default(false),
    updatedAt: updatedAt(),
  },
  (table) => [check('store_settings_single_row', sql`${table.id} = 1`)],
)

export type StoreSettings = typeof storeSettings.$inferSelect

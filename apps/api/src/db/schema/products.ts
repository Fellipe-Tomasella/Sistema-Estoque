import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from './columns'

export const products = pgTable(
  'products',
  {
    id: id(),
    name: text().notNull(),
    reference: text(),
    category: text(),
    description: text(),
    basePriceCents: integer().notNull(),
    costCents: integer(),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('products_base_price_check', sql`${table.basePriceCents} >= 0`),
    check('products_cost_check', sql`${table.costCents} >= 0`),
    index('products_name_search_idx').using('gin', sql`immutable_unaccent(lower(${table.name})) gin_trgm_ops`),
  ],
)

export const variants = pgTable(
  'variants',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    color: text().notNull(),
    size: text().notNull(),
    sizeSort: integer().notNull(),
    /** null = usa o preço base do produto (RN-PRO-05). */
    priceCents: integer(),
    costCents: integer(),
    sku: text(),
    /** Saldo atual: cache do ledger `stock_movements`, só alterado pelo StockService. */
    stockQty: integer().notNull().default(0),
    /** null = sem alerta de reposição (RN-EST-08). */
    minStock: integer(),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('variants_product_color_size_uq').on(
      table.productId,
      sql`lower(${table.color})`,
      sql`lower(${table.size})`,
    ),
    check('variants_stock_qty_check', sql`${table.stockQty} >= 0`),
    check('variants_price_check', sql`${table.priceCents} >= 0`),
    check('variants_cost_check', sql`${table.costCents} >= 0`),
    check('variants_min_stock_check', sql`${table.minStock} >= 0`),
  ],
)

export type Product = typeof products.$inferSelect
export type Variant = typeof variants.$inferSelect

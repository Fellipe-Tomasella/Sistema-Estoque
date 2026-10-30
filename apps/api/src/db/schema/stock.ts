import { ADJUSTMENT_REASONS, IMPORT_STATUSES, STOCK_MOVEMENT_TYPES, STOCK_REF_TYPES } from '@estoque/shared'
import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { createdAt, id } from './columns'
import { variants } from './products'

export const stockMovementType = pgEnum('stock_movement_type', STOCK_MOVEMENT_TYPES)
export const adjustmentReason = pgEnum('adjustment_reason', ADJUSTMENT_REASONS)
export const stockRefType = pgEnum('stock_ref_type', STOCK_REF_TYPES)

/** Ledger do estoque: só INSERT. `variants.stock_qty` = soma de `quantity_delta`. */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: id(),
    variantId: uuid()
      .notNull()
      .references(() => variants.id),
    type: stockMovementType().notNull(),
    quantityDelta: integer().notNull(),
    balanceAfter: integer().notNull(),
    adjustmentReason: adjustmentReason(),
    countedQty: integer(),
    note: text(),
    refType: stockRefType(),
    refId: uuid(),
    businessDate: date({ mode: 'string' }).notNull(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [
    check('stock_movements_delta_check', sql`${table.quantityDelta} <> 0`),
    check('stock_movements_balance_check', sql`${table.balanceAfter} >= 0`),
    index().on(table.variantId, table.createdAt),
    // Anti-duplicidade: a mesma venda/devolução/importação não movimenta a mesma variação duas vezes.
    uniqueIndex('stock_movements_ref_uq')
      .on(table.refType, table.refId, table.variantId, table.type)
      .where(sql`${table.refType} in ('sale', 'return_item', 'import')`),
  ],
)

export type StockMovement = typeof stockMovements.$inferSelect

/** Entrada de mercadoria (RN-EST-03). O `id` é a Idempotency-Key enviada pelo front. */
export const stockEntries = pgTable('stock_entries', {
  id: uuid().primaryKey(),
  entryDate: date({ mode: 'string' }).notNull(),
  supplierName: text(),
  reference: text(),
  notes: text(),
  createdBy: uuid().references(() => users.id),
  createdAt: createdAt(),
})

export const stockEntryItems = pgTable(
  'stock_entry_items',
  {
    id: id(),
    entryId: uuid()
      .notNull()
      .references(() => stockEntries.id),
    variantId: uuid()
      .notNull()
      .references(() => variants.id),
    quantity: integer().notNull(),
    unitCostCents: integer(),
  },
  (table) => [
    check('stock_entry_items_quantity_check', sql`${table.quantity} > 0`),
    check('stock_entry_items_cost_check', sql`${table.unitCostCents} >= 0`),
    index().on(table.entryId),
  ],
)

export const importStatus = pgEnum('import_status', IMPORT_STATUSES)

/** Importação da planilha inicial (RN-IMP): prévia guardada, efetivada uma única vez. */
export const importBatches = pgTable('import_batches', {
  id: id(),
  fileName: text().notNull(),
  status: importStatus().notNull().default('previewed'),
  preview: jsonb().notNull(),
  summary: jsonb().notNull(),
  result: jsonb(),
  createdBy: uuid().references(() => users.id),
  createdAt: createdAt(),
  committedAt: timestamp({ withTimezone: true }),
})

export type StockEntry = typeof stockEntries.$inferSelect
export type ImportBatch = typeof importBatches.$inferSelect

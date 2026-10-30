import { ADJUSTMENT_REASONS, STOCK_MOVEMENT_TYPES, STOCK_REF_TYPES } from '@estoque/shared'
import { sql } from 'drizzle-orm'
import { check, date, index, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
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

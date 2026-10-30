import {
  ITEM_CONDITIONS,
  RECEIVABLE_ADJUSTMENT_REASONS,
  REFUND_SOURCES,
  REFUND_STATUSES,
  RETURN_ITEM_STATUSES,
  RETURN_STATUSES,
  RETURN_TYPES,
} from '@estoque/shared'
import { sql } from 'drizzle-orm'
import { check, date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { createdAt, id } from './columns'
import { variants } from './products'
import { receivables, saleItems, sales } from './sales'

export const returnType = pgEnum('return_type', RETURN_TYPES)
export const returnStatus = pgEnum('return_status', RETURN_STATUSES)
export const returnItemStatus = pgEnum('return_item_status', RETURN_ITEM_STATUSES)
export const itemCondition = pgEnum('item_condition', ITEM_CONDITIONS)
export const refundSource = pgEnum('refund_source', REFUND_SOURCES)
export const refundStatus = pgEnum('refund_status', REFUND_STATUSES)
export const receivableAdjustmentReason = pgEnum('receivable_adjustment_reason', RECEIVABLE_ADJUSTMENT_REASONS)

/** Peças voltando da cliente: cancelamento, devolução parcial ou troca (RN-CAN-04, RN-DEV). */
export const returns = pgTable(
  'returns',
  {
    id: id(),
    saleId: uuid()
      .notNull()
      .references(() => sales.id),
    type: returnType().notNull(),
    status: returnStatus().notNull(),
    reason: text(),
    /** Valor (já com desconto rateado) das peças devolvidas. */
    itemsValueCents: integer().notNull(),
    appliedToReceivableCents: integer().notNull().default(0),
    refundCents: integer().notNull().default(0),
    exchangeCreditCents: integer().notNull().default(0),
    exchangeSaleId: uuid().references(() => sales.id),
    businessDate: date({ mode: 'string' }).notNull(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.saleId), index().on(table.status)],
)

export const returnItems = pgTable(
  'return_items',
  {
    id: id(),
    returnId: uuid()
      .notNull()
      .references(() => returns.id),
    saleItemId: uuid()
      .notNull()
      .references(() => saleItems.id),
    variantId: uuid()
      .notNull()
      .references(() => variants.id),
    quantity: integer().notNull(),
    status: returnItemStatus().notNull(),
    condition: itemCondition(),
    receivedAt: timestamp({ withTimezone: true }),
  },
  (table) => [check('return_items_quantity_check', sql`${table.quantity} > 0`), index().on(table.returnId)],
)

/** Valor a devolver à cliente (RN-CAN-05, RN-DEV-08). Entra no fechamento do dia em que foi devolvido. */
export const refunds = pgTable(
  'refunds',
  {
    id: id(),
    saleId: uuid()
      .notNull()
      .references(() => sales.id),
    source: refundSource().notNull(),
    /** A venda (cancelamento) ou o registro de devolução. */
    sourceId: uuid().notNull(),
    amountCents: integer().notNull(),
    status: refundStatus().notNull().default('pending'),
    method: text(),
    doneAt: timestamp({ withTimezone: true }),
    businessDate: date({ mode: 'string' }),
    notes: text(),
    cancelReason: text(),
    createdAt: createdAt(),
  },
  (table) => [
    check('refunds_amount_check', sql`${table.amountCents} > 0`),
    check('refunds_method_check', sql`${table.method} is null or ${table.method} in ('cash', 'pix', 'card')`),
    index().on(table.status),
    index().on(table.businessDate),
  ],
)

/** Abatimentos de dívida que não são pagamento: cancelamento ou devolução de peças. */
export const receivableAdjustments = pgTable(
  'receivable_adjustments',
  {
    id: id(),
    receivableId: uuid()
      .notNull()
      .references(() => receivables.id),
    amountCents: integer().notNull(),
    reason: receivableAdjustmentReason().notNull(),
    refType: text().notNull(),
    refId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check('receivable_adjustments_amount_check', sql`${table.amountCents} > 0`),
    index().on(table.receivableId),
  ],
)

export type Return = typeof returns.$inferSelect
export type ReturnItem = typeof returnItems.$inferSelect
export type Refund = typeof refunds.$inferSelect

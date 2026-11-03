import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, pgEnum, pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from './columns'
import { sales } from './sales'
import { variants } from './products'

export const WEB_ORDER_STATUSES = ['new', 'contacted', 'converted', 'declined'] as const
export const webOrderStatus = pgEnum('web_order_status', WEB_ORDER_STATUSES)

/**
 * Pedido (interesse) enviado pelo site (docs/11 §5, RN-LOJ-05 a 08). Não mexe no estoque:
 * a dona confere, fala com a cliente e o transforma em venda no PDV.
 */
export const webOrders = pgTable(
  'web_orders',
  {
    /** = Idempotency-Key do envio: reenviar o mesmo pedido devolve o já gravado. */
    id: uuid().primaryKey(),
    /** Número curto para falar com a cliente (“pedido 12”). */
    number: serial().notNull().unique(),
    status: webOrderStatus().notNull().default('new'),
    customerName: text().notNull(),
    /** Só dígitos, com DDI. */
    whatsapp: text().notNull(),
    email: text(),
    city: text(),
    notes: text(),
    /** Soma dos itens com preço (os “Consulte” ficam fora). */
    totalCents: integer().notNull(),
    hasHiddenPrices: boolean().notNull().default(false),
    saleId: uuid().references(() => sales.id),
    declineReason: text(),
    contactedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('web_orders_status_idx').on(table.status, table.createdAt),
    check('web_orders_total_check', sql`${table.totalCents} >= 0`),
  ],
)

export const webOrderItems = pgTable(
  'web_order_items',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => webOrders.id),
    variantId: uuid()
      .notNull()
      .references(() => variants.id),
    productName: text().notNull(),
    variantLabel: text().notNull(),
    /** Preço que o site mostrou; null = “Consulte”. */
    unitPriceCents: integer(),
    quantity: integer().notNull(),
  },
  (table) => [
    index('web_order_items_order_idx').on(table.orderId),
    check('web_order_items_quantity_check', sql`${table.quantity} > 0`),
  ],
)

export type WebOrder = typeof webOrders.$inferSelect
export type WebOrderItem = typeof webOrderItems.$inferSelect

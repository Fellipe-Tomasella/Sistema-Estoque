import {
  BUYER_TYPES,
  CARD_TYPES,
  DISCOUNT_KINDS,
  FISCAL_REQUIREMENTS,
  PAYMENT_KINDS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES_OF_SALE,
  RECEIVABLE_ORIGINS,
  RECEIVABLE_STATUSES,
  RECORD_STATUSES,
  SALE_STATUSES,
  SHIPPING_STATUSES,
} from '@estoque/shared'
import { type SQL, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { createdAt, id, updatedAt } from './columns'
import { type Address, customers } from './customers'
import { variants } from './products'

export const saleStatus = pgEnum('sale_status', SALE_STATUSES)
export const salePaymentStatus = pgEnum('sale_payment_status', PAYMENT_STATUSES_OF_SALE)
export const shippingStatus = pgEnum('shipping_status', SHIPPING_STATUSES)
export const discountKind = pgEnum('discount_kind', DISCOUNT_KINDS)
export const buyerType = pgEnum('buyer_type', BUYER_TYPES)
export const fiscalRequirement = pgEnum('fiscal_requirement', FISCAL_REQUIREMENTS)
export const paymentKind = pgEnum('payment_kind', PAYMENT_KINDS)
export const paymentMethod = pgEnum('payment_method', PAYMENT_METHODS)
export const cardType = pgEnum('card_type', CARD_TYPES)
export const recordStatus = pgEnum('record_status', RECORD_STATUSES)
export const receivableOrigin = pgEnum('receivable_origin', RECEIVABLE_ORIGINS)
export const receivableStatus = pgEnum('receivable_status', RECEIVABLE_STATUSES)

/** Número humano da venda: atribuído só na confirmação (rascunho não consome número). */
export const saleNumberSeq = pgSequence('sale_number_seq')

/** Pagamento planejado no rascunho; vira linha em `payments` na confirmação. */
export interface DraftPayment {
  id: string
  method: 'cash' | 'pix' | 'card'
  amountCents: number
  /** Pix/cartão: a dona marca que recebeu/aprovou. Dinheiro vem recebido por padrão. */
  confirmed: boolean
  cardType?: 'credit' | 'debit' | null
  installments?: number | null
  /** Só dinheiro: valor entregue, para calcular o troco (não é gravado no pagamento). */
  cashGivenCents?: number | null
}

export interface CustomerSnapshot {
  name: string
  phone: string | null
  document: string | null
  documentType: 'cpf' | 'cnpj' | null
}

export const sales = pgTable(
  'sales',
  {
    id: id(),
    number: integer().unique(),
    status: saleStatus().notNull().default('draft'),
    version: integer().notNull().default(1),
    customerId: uuid().references(() => customers.id),
    customerSnapshot: jsonb().$type<CustomerSnapshot>(),
    buyerType: buyerType(),
    subtotalCents: integer().notNull().default(0),
    discountKind: discountKind().notNull().default('none'),
    /** Centavos (amount) ou pontos-base (percent). */
    discountValue: integer().notNull().default(0),
    discountCents: integer().notNull().default(0),
    totalCents: integer().notNull().default(0),
    draftPayments: jsonb().$type<DraftPayment[]>().notNull().default([]),
    draftFiado: boolean().notNull().default(false),
    draftFiadoDueDate: date({ mode: 'string' }),
    paymentStatus: salePaymentStatus(),
    shippingStatus: shippingStatus().notNull().default('none'),
    shippingAddress: jsonb().$type<Address>(),
    shippingUf: text(),
    trackingCode: text(),
    shippedAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    fiscalRequirement: fiscalRequirement(),
    fiscalNote: text(),
    fiscalRequested: boolean().notNull().default(false),
    channel: text(),
    notes: text(),
    /** Venda gerada por troca (Etapa 8). */
    originReturnId: uuid(),
    confirmedAt: timestamp({ withTimezone: true }),
    businessDate: date({ mode: 'string' }),
    cancelledAt: timestamp({ withTimezone: true }),
    cancelReason: text(),
    cancelledBy: uuid().references(() => users.id),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      'sales_discount_check',
      sql`${table.discountCents} >= 0 and ${table.discountCents} <= ${table.subtotalCents}`,
    ),
    check('sales_total_check', sql`${table.totalCents} = ${table.subtotalCents} - ${table.discountCents}`),
    index().on(table.status, table.businessDate),
    index().on(table.customerId),
  ],
)

export const saleItems = pgTable(
  'sale_items',
  {
    id: id(),
    saleId: uuid()
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    variantId: uuid()
      .notNull()
      .references(() => variants.id),
    /** Nome, rótulo e preço congelados na confirmação (RN-PRO-06). */
    productName: text().notNull(),
    variantLabel: text().notNull(),
    unitPriceCents: integer().notNull(),
    quantity: integer().notNull(),
    lineSubtotalCents: integer().notNull(),
    discountAllocatedCents: integer().notNull().default(0),
    lineTotalCents: integer().notNull(),
    /** Peças devolvidas ou aguardando retorno (Etapas 7–8). */
    returnedQty: integer().notNull().default(0),
  },
  (table) => [
    uniqueIndex('sale_items_sale_variant_uq').on(table.saleId, table.variantId),
    check('sale_items_quantity_check', sql`${table.quantity} > 0`),
    check('sale_items_returned_check', sql`${table.returnedQty} >= 0 and ${table.returnedQty} <= ${table.quantity}`),
  ],
)

/** Pagamentos: só INSERT + anulação. O `id` é a chave gerada pelo front (idempotência). */
export const payments = pgTable(
  'payments',
  {
    id: uuid().primaryKey(),
    kind: paymentKind().notNull(),
    method: paymentMethod().notNull(),
    cardType: cardType(),
    cardInstallments: integer(),
    amountCents: integer().notNull(),
    saleId: uuid().references(() => sales.id),
    customerId: uuid().references(() => customers.id),
    businessDate: date({ mode: 'string' }).notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    status: recordStatus().notNull().default('valid'),
    voidedAt: timestamp({ withTimezone: true }),
    voidReason: text(),
    voidedBy: uuid().references(() => users.id),
    notes: text(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [
    check('payments_amount_check', sql`${table.amountCents} > 0`),
    index().on(table.saleId),
    index().on(table.businessDate),
  ],
)

const balance = (table: { originalCents: unknown; paidCents: unknown; adjustedCents: unknown }): SQL =>
  sql`${table.originalCents} - ${table.paidCents} - ${table.adjustedCents}`

/** Dívidas do fiado. Saldo calculado pelo banco a partir dos caches de pago e ajustado. */
export const receivables = pgTable(
  'receivables',
  {
    id: id(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id),
    saleId: uuid().references(() => sales.id),
    origin: receivableOrigin().notNull(),
    description: text().notNull(),
    originalCents: integer().notNull(),
    paidCents: integer().notNull().default(0),
    adjustedCents: integer().notNull().default(0),
    balanceCents: integer()
      .notNull()
      .generatedAlwaysAs((): SQL => sql`original_cents - paid_cents - adjusted_cents`),
    dueDate: date({ mode: 'string' }),
    status: receivableStatus().notNull().default('open'),
    businessDate: date({ mode: 'string' }).notNull(),
    settledAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('receivables_original_check', sql`${table.originalCents} > 0`),
    check('receivables_balance_check', sql`${balance(table)} >= 0`),
    uniqueIndex('receivables_sale_uq')
      .on(table.saleId)
      .where(sql`${table.saleId} is not null`),
    index().on(table.customerId, table.status),
  ],
)

export type Sale = typeof sales.$inferSelect
export type SaleItem = typeof saleItems.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Receivable = typeof receivables.$inferSelect

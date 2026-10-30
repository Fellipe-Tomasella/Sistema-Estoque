// Valores compartilhados entre API e front. Cada etapa acrescenta os enums do seu domínio.

export const ErrorCode = {
  VALIDATION: 'VALIDATION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  BUSINESS_RULE: 'BUSINESS_RULE',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INTERNAL: 'INTERNAL',
} as const
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export const TAX_REGIMES = ['mei', 'simples', 'other'] as const
export type TaxRegime = (typeof TAX_REGIMES)[number]

export const DOCUMENT_TYPES = ['cpf', 'cnpj'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

// Estoque

export const STOCK_MOVEMENT_TYPES = [
  'initial',
  'purchase_entry',
  'sale',
  'sale_cancel_return',
  'return_in',
  'adjustment',
] as const
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]

export const ADJUSTMENT_REASONS = ['count', 'loss', 'damage', 'error', 'other'] as const
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]

export const STOCK_REF_TYPES = ['stock_entry', 'sale', 'return_item', 'import', 'manual'] as const
export type StockRefType = (typeof STOCK_REF_TYPES)[number]

// Vendas e pagamentos

export const SALE_STATUSES = ['draft', 'confirmed', 'cancelled'] as const
export type SaleStatus = (typeof SALE_STATUSES)[number]

export const PAYMENT_STATUSES_OF_SALE = ['paid', 'partially_paid', 'unpaid'] as const
export type SalePaymentStatus = (typeof PAYMENT_STATUSES_OF_SALE)[number]

export const SHIPPING_STATUSES = ['none', 'pending', 'shipped', 'delivered'] as const
export type ShippingStatus = (typeof SHIPPING_STATUSES)[number]

export const DISCOUNT_KINDS = ['none', 'amount', 'percent'] as const
export type DiscountKind = (typeof DISCOUNT_KINDS)[number]

export const BUYER_TYPES = ['consumer_pf', 'company_pj'] as const
export type BuyerType = (typeof BUYER_TYPES)[number]

export const FISCAL_REQUIREMENTS = ['not_required', 'required', 'review'] as const
export type FiscalRequirement = (typeof FISCAL_REQUIREMENTS)[number]

/** Formas de dinheiro de verdade. Fiado não é forma de pagamento: é o que fica em aberto. */
export const MONEY_METHODS = ['cash', 'pix', 'card'] as const
export type MoneyMethod = (typeof MONEY_METHODS)[number]

/** `exchange_credit` = crédito de troca (Etapa 8), não é dinheiro. */
export const PAYMENT_METHODS = [...MONEY_METHODS, 'exchange_credit'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_KINDS = ['sale_checkout', 'receivable_receipt', 'exchange_credit'] as const
export type PaymentKind = (typeof PAYMENT_KINDS)[number]

export const CARD_TYPES = ['credit', 'debit'] as const
export type CardType = (typeof CARD_TYPES)[number]

export const RECORD_STATUSES = ['valid', 'voided'] as const

export const RECEIVABLE_ORIGINS = ['sale', 'previous_balance'] as const
export const RECEIVABLE_STATUSES = ['open', 'settled', 'cancelled'] as const
export type ReceivableStatus = (typeof RECEIVABLE_STATUSES)[number]

/** RN-FIA-03: “em atraso” só com data combinada vencida e saldo em aberto. Datas no formato AAAA-MM-DD. */
export function isOverdue(balanceCents: number, dueDate: string | null, today: string): boolean {
  return balanceCents > 0 && dueDate !== null && dueDate < today
}

export const IMPORT_STATUSES = ['previewed', 'committed', 'discarded'] as const
export type ImportStatus = (typeof IMPORT_STATUSES)[number]

export const STOCK_STATUSES = ['out', 'low', 'ok'] as const
export type StockStatus = (typeof STOCK_STATUSES)[number]

/** RN-EST-08: “sem estoque” com saldo 0; “repor” quando há mínimo e o saldo chegou nele. */
export function stockStatus(stockQty: number, minStock: number | null): StockStatus {
  if (stockQty === 0) return 'out'
  if (minStock !== null && stockQty <= minStock) return 'low'
  return 'ok'
}

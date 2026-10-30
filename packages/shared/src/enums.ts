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

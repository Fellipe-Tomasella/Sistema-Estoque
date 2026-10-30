// Valores compartilhados entre API e front. Cada etapa acrescenta os enums do seu domínio.

export const ErrorCode = {
  VALIDATION: 'VALIDATION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  BUSINESS_RULE: 'BUSINESS_RULE',
  INTERNAL: 'INTERNAL',
} as const
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export const TAX_REGIMES = ['mei', 'simples', 'other'] as const
export type TaxRegime = (typeof TAX_REGIMES)[number]

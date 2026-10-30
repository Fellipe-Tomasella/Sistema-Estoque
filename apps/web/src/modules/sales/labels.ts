import type { FiscalRequirement, SalePaymentStatus, SaleStatus, ShippingStatus } from '@estoque/shared'

type Tone = 'critical' | 'warning' | 'success' | 'neutral' | 'info'
type Labels<K extends string> = Record<K, { label: string; tone: Tone }>

/** Nomes e cores das situações da venda, iguais em lista, detalhe e cliente. */
export const SALE_STATUS: Labels<SaleStatus> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  confirmed: { label: 'Confirmada', tone: 'success' },
  cancelled: { label: 'Cancelada', tone: 'critical' },
}
export const PAYMENT_STATUS: Labels<SalePaymentStatus> = {
  paid: { label: 'Paga', tone: 'success' },
  partially_paid: { label: 'Parcial', tone: 'warning' },
  unpaid: { label: 'Fiado', tone: 'warning' },
}
export const SHIPPING_STATUS: Labels<ShippingStatus> = {
  none: { label: 'Sem envio', tone: 'neutral' },
  pending: { label: 'Aguardando envio', tone: 'warning' },
  shipped: { label: 'Enviado', tone: 'info' },
  delivered: { label: 'Entregue', tone: 'success' },
}
export const FISCAL: Labels<FiscalRequirement> = {
  not_required: { label: 'Dispensa provável — MEI', tone: 'neutral' },
  required: { label: 'Precisa de nota', tone: 'critical' },
  review: { label: 'Revisar com o contador', tone: 'warning' },
}
export const METHOD: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  exchange_credit: 'Crédito de troca',
}
export const FISCAL_DOC: Record<string, string> = { nfe: 'NF-e', nfce: 'NFC-e', nfa_e: 'NFA-e', other: 'Outro' }

/** RN-ENV-02: aguardando → enviado → entregue, podendo voltar um passo. */
export const NEXT_SHIPPING: Record<ShippingStatus, { to: ShippingStatus; label: string } | null> = {
  none: null,
  pending: { to: 'shipped', label: 'Marcar como enviado' },
  shipped: { to: 'delivered', label: 'Marcar como entregue' },
  delivered: null,
}

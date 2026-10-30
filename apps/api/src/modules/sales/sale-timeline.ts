// Linha do tempo da venda (RN-DEV-09): cancelamento, retorno físico, devolução de dinheiro e nota são registros
// separados, todos visíveis aqui.
import { formatBRL, type ShippingStatus } from '@estoque/shared'
import type { Payment, Refund, Return, Sale } from '../../db/schema'
import { formatSaleNumber, type TimelineEvent } from './sale-view'

export const METHOD_NAMES: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  exchange_credit: 'Crédito de troca',
}
export const SHIPPING_NAMES: Record<ShippingStatus, string> = {
  none: 'Sem envio',
  pending: 'Aguardando envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
}
const RETURN_NAMES: Record<Return['type'], string> = {
  cancellation: 'Cancelamento',
  partial_return: 'Devolução de peças',
  exchange: 'Troca',
}

export interface AuditEntry {
  action: string
  createdAt: Date
  after: unknown
  reason: string | null
}

export function buildTimeline(
  sale: Sale,
  payments: Payment[],
  returns: (Return & { items: { quantity: number; status: string }[] })[],
  refunds: Refund[],
  history: AuditEntry[],
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const push = (at: Date | null, type: string, description: string) => at && events.push({ at, type, description })

  push(sale.confirmedAt, 'confirmed', `Venda ${formatSaleNumber(sale.number)} confirmada`)
  for (const payment of payments) {
    const label = payment.kind === 'receivable_receipt' ? 'Recebimento de fiado' : 'Pagamento'
    const voided = payment.status === 'voided' ? ' (estornado)' : ''
    push(
      payment.receivedAt,
      payment.kind,
      `${label}: ${METHOD_NAMES[payment.method]} ${formatBRL(payment.amountCents)}${voided}`,
    )
  }
  push(sale.cancelledAt, 'cancelled', `Venda cancelada: ${sale.cancelReason}`)
  for (const ret of returns) {
    const pieces = ret.items.reduce((sum, item) => sum + item.quantity, 0)
    const awaiting = ret.items.filter((i) => i.status === 'awaiting').reduce((sum, item) => sum + item.quantity, 0)
    const detail = awaiting > 0 ? `${awaiting} aguardando retorno` : `${pieces} ${pieces === 1 ? 'peça' : 'peças'}`
    push(ret.createdAt, `return_${ret.type}`, `${RETURN_NAMES[ret.type]}: ${detail}`)
  }
  for (const refund of refunds) {
    push(refund.createdAt, 'refund_pending', `Valor a devolver: ${formatBRL(refund.amountCents)}`)
    if (refund.status === 'done') {
      push(
        refund.doneAt,
        'refund_done',
        `Valor devolvido: ${formatBRL(refund.amountCents)} (${METHOD_NAMES[refund.method!]})`,
      )
    }
  }
  for (const entry of history) {
    if (entry.action === 'shipping') {
      const status = (entry.after as { status: ShippingStatus }).status
      push(entry.createdAt, 'shipping', `Envio: ${SHIPPING_NAMES[status]}`)
    }
    if (entry.action === 'payment_method_change') {
      const method = (entry.after as { method: string }).method
      push(
        entry.createdAt,
        'payment_method_change',
        `Forma de pagamento trocada para ${METHOD_NAMES[method]}: ${entry.reason}`,
      )
    }
    if (entry.action === 'item_received') {
      const condition = (entry.after as { condition: string }).condition
      push(
        entry.createdAt,
        'item_received',
        `Peça recebida de volta: ${condition === 'sellable' ? 'apta' : 'avariada'}`,
      )
    }
    if (entry.action === 'fiscal_registered') {
      push(
        entry.createdAt,
        'fiscal_registered',
        `Nota fiscal registrada: nº ${(entry.after as { number: string }).number}`,
      )
    }
    if (entry.action === 'fiscal_cancelled') {
      push(entry.createdAt, 'fiscal_cancelled', 'Nota fiscal registrada como cancelada no emissor')
    }
    if (entry.action === 'refund_cancelled') {
      push(entry.createdAt, 'refund_cancelled', `Devolução de valor anulada: ${entry.reason}`)
    }
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime())
}

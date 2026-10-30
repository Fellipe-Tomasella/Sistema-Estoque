// Formato único da venda para a API: o mesmo para rascunho (calculado ao vivo) e venda confirmada (valores gravados).
import type { Payment, Receivable, Refund, Sale, SaleItem } from '../../db/schema'
import type { ReturnWithItems } from '../returns/returns.repository'
import type { CartResult } from './sale-calculator'

export const formatSaleNumber = (number: number | null) => (number ? `#${String(number).padStart(6, '0')}` : null)

export interface TimelineEvent {
  at: Date
  type: string
  description: string
}

function common(sale: Sale) {
  return {
    id: sale.id,
    number: sale.number,
    numberLabel: formatSaleNumber(sale.number),
    status: sale.status,
    version: sale.version,
    customerId: sale.customerId,
    customer: sale.customerSnapshot,
    discount: { kind: sale.discountKind, value: sale.discountValue },
    shipping: {
      status: sale.shippingStatus,
      address: sale.shippingAddress,
      uf: sale.shippingUf,
      trackingCode: sale.trackingCode,
      shippedAt: sale.shippedAt,
      deliveredAt: sale.deliveredAt,
    },
    fiscal: {
      buyerType: sale.buyerType,
      requirement: sale.fiscalRequirement,
      note: sale.fiscalNote,
      requested: sale.fiscalRequested,
    },
    notes: sale.notes,
    businessDate: sale.businessDate,
    confirmedAt: sale.confirmedAt,
    cancellation: sale.cancelledAt ? { at: sale.cancelledAt, reason: sale.cancelReason } : null,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  }
}

export function draftView(sale: Sale, cart: CartResult) {
  return {
    ...common(sale),
    items: cart.lines.map((line) => ({
      variantId: line.variantId,
      productName: line.productName,
      variantLabel: line.variantLabel,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      lineSubtotalCents: line.lineSubtotalCents,
      discountAllocatedCents: 0,
      lineTotalCents: line.lineSubtotalCents,
      returnedQty: 0,
      availableQty: line.availableQty,
    })),
    subtotalCents: cart.subtotalCents,
    discountCents: cart.discountCents,
    totalCents: cart.totalCents,
    payments: cart.payments.map((p) => ({ ...p, status: 'draft' as const })),
    paidCents: cart.paidCents,
    fiado: { enabled: sale.draftFiado, cents: cart.fiadoCents, dueDate: sale.draftFiadoDueDate },
    receivable: null,
    paymentStatus: null,
    returns: [] as ReturnWithItems[],
    refunds: [] as Refund[],
    warnings: cart.warnings,
    blockers: cart.blockers,
    canConfirm: cart.blockers.length === 0,
    timeline: [] as TimelineEvent[],
  }
}

export function confirmedView(
  sale: Sale,
  items: SaleItem[],
  payments: Payment[],
  receivable: Receivable | undefined,
  returns: ReturnWithItems[],
  refunds: Refund[],
  timeline: TimelineEvent[],
) {
  const validPayments = payments.filter((p) => p.status === 'valid' && p.kind !== 'receivable_receipt')
  return {
    ...common(sale),
    items: items.map((item) => ({ ...item, availableQty: null })),
    subtotalCents: sale.subtotalCents,
    discountCents: sale.discountCents,
    totalCents: sale.totalCents,
    payments: payments.map((p) => ({
      id: p.id,
      kind: p.kind,
      method: p.method,
      amountCents: p.amountCents,
      cardType: p.cardType,
      installments: p.cardInstallments,
      businessDate: p.businessDate,
      receivedAt: p.receivedAt,
      status: p.status,
    })),
    paidCents: validPayments.reduce((sum, p) => sum + p.amountCents, 0),
    fiado: {
      enabled: Boolean(receivable),
      cents: receivable?.originalCents ?? 0,
      dueDate: receivable?.dueDate ?? null,
    },
    receivable: receivable
      ? {
          id: receivable.id,
          originalCents: receivable.originalCents,
          paidCents: receivable.paidCents,
          adjustedCents: receivable.adjustedCents,
          balanceCents: receivable.balanceCents,
          dueDate: receivable.dueDate,
          status: receivable.status,
        }
      : null,
    paymentStatus: sale.paymentStatus,
    returns,
    refunds,
    warnings: [] as string[],
    blockers: [] as string[],
    canConfirm: false,
    timeline,
  }
}

export type SaleView = ReturnType<typeof draftView> | ReturnType<typeof confirmedView>

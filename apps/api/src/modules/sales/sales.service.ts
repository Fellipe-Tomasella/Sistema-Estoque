import { formatBRL, type ShippingStatus } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import type { Payment, Sale, SaleItem } from '../../db/schema'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { PaymentsRepository } from '../payments/payments.repository'
import type { ReceivablesRepository } from '../receivables/receivables.repository'
import { type CartLine, calculateCart } from './sale-calculator'
import { confirmedView, draftView, formatSaleNumber, type TimelineEvent } from './sale-view'
import type { SalesRepository } from './sales.repository'
import type { ChangePaymentMethodInput, ListSalesFilters, UpdateShippingInput } from './sales.schemas'
import { normalizeShipping } from './shipping'

const METHOD_NAMES: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  exchange_credit: 'Crédito de troca',
}
const SHIPPING_NAMES: Record<ShippingStatus, string> = {
  none: 'Sem envio',
  pending: 'Aguardando envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
}

/** RN-ENV-02: aguardando → enviado → entregue, podendo voltar um passo. */
const SHIPPING_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
  none: ['pending'],
  pending: ['none', 'shipped'],
  shipped: ['pending', 'delivered'],
  delivered: ['shipped'],
}

/** Consulta e edições permitidas depois da confirmação (RN-VEN-11): envio, observações, forma de pagamento, nota pedida. */
export class SalesService {
  constructor(
    private readonly repo: SalesRepository,
    private readonly payments: PaymentsRepository,
    private readonly receivables: ReceivablesRepository,
    private readonly audit: AuditService,
  ) {}

  /** Linhas do carrinho com preço, saldo e situação atuais do catálogo (o rascunho acompanha o cadastro — RN-PRO-06). */
  async cartLines(items: Pick<SaleItem, 'variantId' | 'quantity'>[], tx?: DbOrTx, lock = false): Promise<CartLine[]> {
    const catalog = await this.repo.catalog(
      items.map((item) => item.variantId),
      tx,
      lock,
    )
    const byId = new Map(catalog.map((row) => [row.variantId, row]))
    return items.map((item) => {
      const row = byId.get(item.variantId)
      if (!row) throw new NotFoundError('Variação não encontrada.')
      return {
        variantId: item.variantId,
        productName: row.productName,
        variantLabel: `${row.color} / ${row.size}`,
        unitPriceCents: row.unitPriceCents,
        quantity: item.quantity,
        availableQty: row.stockQty,
        sellable: row.sellable,
      }
    })
  }

  calculate(sale: Sale, lines: CartLine[]) {
    return calculateCart({
      lines,
      discountKind: sale.discountKind,
      discountValue: sale.discountValue,
      payments: sale.draftPayments,
      fiado: sale.draftFiado,
      customerId: sale.customerId,
    })
  }

  async view(id: string, tx?: DbOrTx) {
    const sale = await this.require(id, tx)
    const items = await this.repo.items(id, tx)
    if (sale.status === 'draft') return draftView(sale, this.calculate(sale, await this.cartLines(items, tx)))

    const [payments, receivable, history] = await Promise.all([
      this.payments.bySale(id, tx),
      this.receivables.bySale(id, tx),
      this.audit.history('sale', id, tx),
    ])
    return confirmedView(sale, items, payments, receivable, this.timeline(sale, payments, history))
  }

  async list(filters: ListSalesFilters) {
    const result = await this.repo.list(filters)
    return { ...result, items: result.items.map(summary) }
  }

  async drafts() {
    return (await this.repo.drafts()).map(summary)
  }

  async updateShipping(id: string, input: UpdateShippingInput, userId: string) {
    return db.transaction(async (tx) => {
      const sale = await this.requireConfirmed(id, tx)
      if (input.status !== sale.shippingStatus && !SHIPPING_TRANSITIONS[sale.shippingStatus].includes(input.status)) {
        throw new BusinessRuleError(
          `Não é possível passar de “${SHIPPING_NAMES[sale.shippingStatus]}” para “${SHIPPING_NAMES[input.status]}”.`,
        )
      }
      const now = new Date()
      const shipping = normalizeShipping(input, sale.shippingAddress)
      const changes = {
        shippingStatus: input.status,
        ...shipping,
        shippedAt: ['shipped', 'delivered'].includes(input.status) ? (sale.shippedAt ?? now) : null,
        deliveredAt: input.status === 'delivered' ? (sale.deliveredAt ?? now) : null,
      }
      const after = await this.repo.update(id, changes, tx)
      await this.audit.record(
        {
          entity: 'sale',
          entityId: id,
          action: 'shipping',
          before: { status: sale.shippingStatus, trackingCode: sale.trackingCode },
          after: { status: after.shippingStatus, trackingCode: after.trackingCode },
          userId,
        },
        tx,
      )
      return this.view(id, tx)
    })
  }

  async updateNotes(id: string, notes: string | null) {
    await this.require(id)
    await this.repo.update(id, { notes: notes?.trim() || null })
    return this.view(id)
  }

  /** RN-PAG-05: troca a forma de um pagamento lançado errado. O valor não muda. */
  async changePaymentMethod(saleId: string, paymentId: string, input: ChangePaymentMethodInput, userId: string) {
    return db.transaction(async (tx) => {
      await this.requireConfirmed(saleId, tx)
      const payment = await this.payments.find(paymentId, tx, true)
      if (!payment || payment.saleId !== saleId || payment.kind !== 'sale_checkout') {
        throw new NotFoundError('Pagamento não encontrado nesta venda.')
      }
      if (payment.status !== 'valid') throw new BusinessRuleError('Este pagamento foi anulado.')
      if (payment.method === input.method && (input.method !== 'card' || payment.cardType === input.cardType)) {
        throw new ValidationError('A forma de pagamento já é esta.')
      }
      const cardType = input.method === 'card' ? (input.cardType ?? null) : null
      await this.payments.update(paymentId, { method: input.method, cardType }, tx)
      await this.audit.record(
        {
          entity: 'sale',
          entityId: saleId,
          action: 'payment_method_change',
          before: { paymentId, method: payment.method, cardType: payment.cardType },
          after: { paymentId, method: input.method, cardType },
          reason: input.reason.trim(),
          userId,
        },
        tx,
      )
      return this.view(saleId, tx)
    })
  }

  /** RN-FIS-05: “cliente pediu nota” torna a nota obrigatória. */
  async flagFiscalRequested(id: string, userId: string) {
    return db.transaction(async (tx) => {
      const sale = await this.requireConfirmed(id, tx)
      if (!sale.fiscalRequested) {
        await this.repo.update(
          id,
          {
            fiscalRequested: true,
            fiscalRequirement: 'required',
            fiscalNote: sale.fiscalRequirement === 'required' ? sale.fiscalNote : 'Cliente pediu nota fiscal.',
          },
          tx,
        )
        await this.audit.record({ entity: 'sale', entityId: id, action: 'fiscal_requested', userId }, tx)
      }
      return this.view(id, tx)
    })
  }

  async require(id: string, tx?: DbOrTx, lock = false) {
    const sale = await this.repo.find(id, tx, lock)
    if (!sale) throw new NotFoundError('Venda não encontrada.')
    return sale
  }

  private async requireConfirmed(id: string, tx: DbOrTx) {
    const sale = await this.require(id, tx, true)
    if (sale.status === 'draft') throw new BusinessRuleError('Esta venda ainda é um rascunho.')
    if (sale.status === 'cancelled') throw new BusinessRuleError('Esta venda foi cancelada.')
    return sale
  }

  /** Linha do tempo da venda (RN-DEV-09). As etapas seguintes acrescentam devoluções, cancelamento e NF. */
  private timeline(
    sale: Sale,
    payments: Payment[],
    history: { action: string; createdAt: Date; after: unknown; reason: string | null }[],
  ): TimelineEvent[] {
    const events: TimelineEvent[] = []
    if (sale.confirmedAt) {
      events.push({
        at: sale.confirmedAt,
        type: 'confirmed',
        description: `Venda ${formatSaleNumber(sale.number)} confirmada`,
      })
    }
    for (const payment of payments) {
      const label = payment.kind === 'receivable_receipt' ? 'Recebimento de fiado' : 'Pagamento'
      const voided = payment.status === 'voided' ? ' (estornado)' : ''
      events.push({
        at: payment.receivedAt,
        type: payment.kind,
        description: `${label}: ${METHOD_NAMES[payment.method]} ${formatBRL(payment.amountCents)}${voided}`,
      })
    }
    for (const entry of history) {
      if (entry.action === 'shipping') {
        const status = (entry.after as { status: ShippingStatus }).status
        events.push({ at: entry.createdAt, type: 'shipping', description: `Envio: ${SHIPPING_NAMES[status]}` })
      }
      if (entry.action === 'payment_method_change') {
        const method = (entry.after as { method: string }).method
        events.push({
          at: entry.createdAt,
          type: 'payment_method_change',
          description: `Forma de pagamento trocada para ${METHOD_NAMES[method]}: ${entry.reason}`,
        })
      }
    }
    if (sale.cancelledAt) {
      events.push({ at: sale.cancelledAt, type: 'cancelled', description: `Venda cancelada: ${sale.cancelReason}` })
    }
    return events.sort((a, b) => a.at.getTime() - b.at.getTime())
  }
}

function summary(sale: Sale) {
  return {
    id: sale.id,
    number: sale.number,
    numberLabel: formatSaleNumber(sale.number),
    status: sale.status,
    businessDate: sale.businessDate,
    confirmedAt: sale.confirmedAt,
    customerId: sale.customerId,
    customerName: sale.customerSnapshot?.name ?? null,
    totalCents: sale.totalCents,
    paymentStatus: sale.paymentStatus,
    shippingStatus: sale.shippingStatus,
    fiscalRequirement: sale.fiscalRequirement,
    updatedAt: sale.updatedAt,
  }
}

import type { ShippingStatus } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import type { Sale, SaleItem } from '../../db/schema'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { PaymentsRepository } from '../payments/payments.repository'
import type { ReceivablesRepository } from '../receivables/receivables.repository'
import type { FiscalRepository } from '../fiscal/fiscal.repository'
import type { RefundsRepository } from '../returns/refunds.repository'
import type { ReturnsRepository } from '../returns/returns.repository'
import { type CartLine, calculateCart } from './sale-calculator'
import { buildTimeline, SHIPPING_NAMES } from './sale-timeline'
import { confirmedView, draftView, formatSaleNumber } from './sale-view'
import type { SalesRepository } from './sales.repository'
import type { ChangePaymentMethodInput, ListSalesFilters, UpdateShippingInput } from './sales.schemas'
import { normalizeShipping } from './shipping'

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
    private readonly returns: ReturnsRepository,
    private readonly refunds: RefundsRepository,
    private readonly fiscal: FiscalRepository,
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

  calculate(sale: Sale, lines: CartLine[], creditCents = 0) {
    return calculateCart({
      lines,
      discountKind: sale.discountKind,
      discountValue: sale.discountValue,
      payments: sale.draftPayments,
      fiado: sale.draftFiado,
      customerId: sale.customerId,
      creditCents,
    })
  }

  async view(id: string, tx?: DbOrTx) {
    const sale = await this.require(id, tx)
    const items = await this.repo.items(id, tx)
    if (sale.status === 'draft') return draftView(sale, this.calculate(sale, await this.cartLines(items, tx)))

    const [payments, receivable, returns, refunds, fiscalDocuments, history] = await Promise.all([
      this.payments.bySale(id, tx),
      this.receivables.bySale(id, tx),
      this.returns.bySale(id, tx),
      this.refunds.bySale(id, tx),
      this.fiscal.bySale(id, tx),
      this.audit.history('sale', id, tx),
    ])
    const timeline = buildTimeline(sale, payments, returns, refunds, history)
    return { ...confirmedView(sale, items, payments, receivable, returns, refunds, timeline), fiscalDocuments }
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

import { allocateDiscount, ErrorCode, type SalePaymentStatus } from '@estoque/shared'
import { db } from '../../db/client'
import type { Customer, Sale } from '../../db/schema'
import { businessDate } from '../../shared/business-date'
import { BusinessRuleError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { CustomersService } from '../customers/customers.service'
import { classifyFiscal } from '../fiscal/fiscal-classifier'
import type { PaymentsRepository } from '../payments/payments.repository'
import type { ReceivablesRepository } from '../receivables/receivables.repository'
import type { SettingsService } from '../settings/settings.service'
import type { StockService } from '../stock/stock.service'
import { lineName } from './sale-calculator'
import { formatSaleNumber } from './sale-view'
import type { SalesRepository } from './sales.repository'
import type { SalesService } from './sales.service'

const units = (n: number) => `${n} ${n === 1 ? 'unidade' : 'unidades'}`

function paymentStatus(paidCents: number, fiadoCents: number): SalePaymentStatus {
  if (fiadoCents === 0) return 'paid'
  return paidCents > 0 ? 'partially_paid' : 'unpaid'
}

const snapshotOf = (customer: Customer) => ({
  name: customer.name,
  phone: customer.phone,
  document: customer.document,
  documentType: customer.documentType,
})

/**
 * Confirmação da venda (RN-VEN-07): numa transação, trava a venda e as variações, confere de novo o saldo,
 * congela nomes e preços, rateia o desconto, baixa o estoque, grava pagamentos, cria o fiado e classifica a nota.
 * Confirmar de novo devolve a mesma venda sem efeito duplicado (RN-VEN-08).
 */
export class SaleConfirmationService {
  constructor(
    private readonly repo: SalesRepository,
    private readonly sales: SalesService,
    private readonly payments: PaymentsRepository,
    private readonly receivables: ReceivablesRepository,
    private readonly stock: StockService,
    private readonly settings: SettingsService,
    private readonly customers: CustomersService,
    private readonly audit: AuditService,
  ) {}

  async confirm(id: string, userId: string) {
    const alreadyProcessed = await db.transaction(async (tx) => {
      const sale = await this.sales.require(id, tx, true)
      if (sale.status !== 'draft') return true

      const items = await this.repo.items(id, tx)
      const lines = await this.sales.cartLines(items, tx, true)
      const cart = this.sales.calculate(sale, lines)
      if (cart.blockers.length > 0) {
        throw new BusinessRuleError(cart.blockers[0]!, ErrorCode.BUSINESS_RULE, { blockers: cart.blockers })
      }
      const short = cart.lines.find((line) => line.quantity > line.availableQty)
      if (short) {
        throw new BusinessRuleError(
          `Não foi possível confirmar: só há ${units(short.availableQty)} de ${lineName(short)} (no carrinho: ${short.quantity}).`,
          ErrorCode.INSUFFICIENT_STOCK,
          { variantId: short.variantId, available: short.availableQty, requested: short.quantity },
        )
      }

      const customer = sale.customerId ? await this.customers.require(sale.customerId, tx) : null
      const store = await this.settings.get(tx)
      const now = new Date()
      const context = { businessDate: businessDate(now, store.timezone), userId }
      const number = await this.repo.nextNumber(tx)

      // Congela nome, rótulo e preço; o rateio do desconto define o valor de cada peça em devoluções (RN-VEN-05).
      const allocation = allocateDiscount(
        cart.lines.map((line) => line.lineSubtotalCents),
        cart.discountCents,
      )
      const itemByVariant = new Map(items.map((item) => [item.variantId, item]))
      for (const [index, line] of cart.lines.entries()) {
        await this.repo.updateItem(
          itemByVariant.get(line.variantId)!.id,
          {
            productName: line.productName,
            variantLabel: line.variantLabel,
            unitPriceCents: line.unitPriceCents,
            lineSubtotalCents: line.lineSubtotalCents,
            discountAllocatedCents: allocation[index]!,
            lineTotalCents: line.lineSubtotalCents - allocation[index]!,
          },
          tx,
        )
      }

      await this.stock.apply(
        tx,
        cart.lines.map((line) => ({
          variantId: line.variantId,
          type: 'sale' as const,
          delta: -line.quantity,
          refType: 'sale' as const,
          refId: id,
        })),
        context,
      )

      await this.payments.insertMany(
        cart.payments.map((payment) => ({
          id: payment.id,
          kind: 'sale_checkout' as const,
          method: payment.method,
          cardType: payment.cardType ?? null,
          cardInstallments: payment.installments ?? null,
          amountCents: payment.amountCents,
          saleId: id,
          customerId: sale.customerId,
          businessDate: context.businessDate,
          receivedAt: now,
          createdBy: userId,
        })),
        tx,
      )

      if (cart.fiadoCents > 0) {
        await this.receivables.insert(
          {
            customerId: customer!.id,
            saleId: id,
            origin: 'sale',
            description: `Venda ${formatSaleNumber(number)}`,
            originalCents: cart.fiadoCents,
            dueDate: sale.draftFiadoDueDate,
            businessDate: context.businessDate,
          },
          tx,
        )
      }

      const shippingAddress = this.shippingAddress(sale, customer)
      const shippingUf = sale.shippingUf ?? shippingAddress?.uf ?? null
      const fiscal = classifyFiscal({
        customerDocumentType: customer?.documentType ?? null,
        fiscalRequested: sale.fiscalRequested,
        hasShipping: sale.shippingStatus !== 'none',
        shippingUf,
        storeUf: store.uf,
      })

      await this.repo.update(
        id,
        {
          status: 'confirmed',
          number,
          version: sale.version + 1,
          customerSnapshot: customer ? snapshotOf(customer) : null,
          subtotalCents: cart.subtotalCents,
          discountCents: cart.discountCents,
          totalCents: cart.totalCents,
          draftPayments: [],
          paymentStatus: paymentStatus(cart.paidCents, cart.fiadoCents),
          shippingAddress,
          shippingUf,
          buyerType: fiscal.buyerType,
          fiscalRequirement: fiscal.requirement,
          fiscalNote: fiscal.note,
          businessDate: context.businessDate,
          confirmedAt: now,
        },
        tx,
      )
      await this.audit.record({ entity: 'sale', entityId: id, action: 'confirm', after: { number }, userId }, tx)
      return false
    })

    return { ...(await this.sales.view(id)), alreadyProcessed }
  }

  /** Com envio e sem endereço próprio, usa o endereço da cliente (RN-ENV-01). */
  private shippingAddress(sale: Sale, customer: Customer | null) {
    if (sale.shippingStatus === 'none') return null
    return sale.shippingAddress ?? customer?.address ?? null
  }
}

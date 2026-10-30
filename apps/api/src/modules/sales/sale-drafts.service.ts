import { db } from '../../db/client'
import type { DraftPayment } from '../../db/schema'
import { BusinessRuleError, ConflictError } from '../../shared/errors'
import type { CustomersService } from '../customers/customers.service'
import type { SaleChanges, SalesRepository } from './sales.repository'
import type { UpdateDraftInput } from './sales.schemas'
import type { SalesService } from './sales.service'
import { normalizeShipping } from './shipping'

/** Mesma variação adicionada de novo soma na linha existente (RN-VEN-02). */
export function mergeItems(items: { variantId: string; quantity: number }[]) {
  const merged = new Map<string, number>()
  for (const item of items) merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity)
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }))
}

export function normalizePayment(payment: DraftPayment): DraftPayment {
  const isCard = payment.method === 'card'
  return {
    id: payment.id,
    method: payment.method,
    amountCents: payment.amountCents,
    // RN-PAG-04: dinheiro vem como recebido; Pix e cartão dependem da dona marcar.
    confirmed: payment.method === 'cash' ? true : payment.confirmed,
    cardType: isCard ? (payment.cardType ?? null) : null,
    installments: isCard ? (payment.installments ?? null) : null,
    cashGivenCents: payment.method === 'cash' ? (payment.cashGivenCents ?? null) : null,
  }
}

/**
 * Rascunho de venda no servidor (RN-VEN-01): aparece no notebook e no celular, não mexe no estoque
 * e não reserva peças. Edição com `version` contra alteração simultânea (RN-VEN-10).
 */
export class SaleDraftsService {
  constructor(
    private readonly repo: SalesRepository,
    private readonly sales: SalesService,
    private readonly customers: CustomersService,
  ) {}

  async create(userId: string) {
    const sale = await this.repo.insert({ createdBy: userId })
    return this.sales.view(sale.id)
  }

  async update(id: string, input: UpdateDraftInput) {
    return db.transaction(async (tx) => {
      const sale = await this.sales.require(id, tx, true)
      if (sale.status !== 'draft') throw new ConflictError('Esta venda já foi confirmada e não pode mais ser editada.')
      if (input.version !== sale.version) {
        throw new ConflictError('Esta venda foi alterada em outro aparelho. Recarregue.', { version: sale.version })
      }

      const changes: SaleChanges = { version: sale.version + 1 }
      if ('customerId' in input) {
        if (input.customerId) {
          const customer = await this.customers.require(input.customerId, tx)
          if (!customer.active) throw new BusinessRuleError('Esta cliente está inativa.')
        }
        changes.customerId = input.customerId ?? null
      }
      if (input.discount) {
        changes.discountKind = input.discount.kind
        changes.discountValue = input.discount.kind === 'none' ? 0 : input.discount.value
      }
      if (input.payments) changes.draftPayments = input.payments.map(normalizePayment)
      if (input.fiado !== undefined) changes.draftFiado = input.fiado
      if ('fiadoDueDate' in input) changes.draftFiadoDueDate = input.fiadoDueDate ?? null
      if ('notes' in input) changes.notes = input.notes?.trim() || null
      if (input.fiscalRequested !== undefined) changes.fiscalRequested = input.fiscalRequested
      if (input.shipping) {
        Object.assign(
          changes,
          input.shipping.enabled
            ? { shippingStatus: 'pending', ...normalizeShipping(input.shipping, sale.shippingAddress) }
            : { shippingStatus: 'none', shippingAddress: null, shippingUf: null, trackingCode: null },
        )
      }

      const items = input.items ? mergeItems(input.items) : await this.repo.items(id, tx)
      const cart = this.sales.calculate({ ...sale, ...changes }, await this.sales.cartLines(items, tx))
      // Guarda o retrato atual do carrinho; os valores definitivos são congelados na confirmação.
      await this.repo.replaceItems(
        id,
        cart.lines.map((line) => ({
          variantId: line.variantId,
          productName: line.productName,
          variantLabel: line.variantLabel,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
          lineSubtotalCents: line.lineSubtotalCents,
          lineTotalCents: line.lineSubtotalCents,
        })),
        tx,
      )
      await this.repo.update(
        id,
        {
          ...changes,
          subtotalCents: cart.subtotalCents,
          discountCents: cart.discountCents,
          totalCents: cart.totalCents,
        },
        tx,
      )
      return this.sales.view(id, tx)
    })
  }

  /** RN-VEN-09: só o rascunho pode ser apagado (não tem efeito financeiro nem de estoque). */
  async discard(id: string) {
    await db.transaction(async (tx) => {
      const sale = await this.sales.require(id, tx, true)
      if (sale.status !== 'draft') {
        throw new BusinessRuleError('Só rascunhos podem ser descartados. Para desfazer uma venda, cancele-a.')
      }
      await this.repo.delete(id, tx)
    })
  }
}

import { formatBRL, type ItemCondition } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import type { Receivable, Sale, SaleItem } from '../../db/schema'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../shared/errors'
import { isUniqueViolation } from '../../shared/sql'
import type { AuditService } from '../audit/audit.service'
import type { ReceivablesRepository } from '../receivables/receivables.repository'
import type { ReceivablesService } from '../receivables/receivables.service'
import type { SaleConfirmationService } from '../sales/sale-confirmation.service'
import { mergeItems, normalizePayment } from '../sales/sale-drafts.service'
import type { SalesRepository } from '../sales/sales.repository'
import type { SalesService } from '../sales/sales.service'
import type { SettingsService } from '../settings/settings.service'
import type { StockService } from '../stock/stock.service'
import type { RefundsRepository } from './refunds.repository'
import type { ReturnsRepository } from './returns.repository'
import type { ReturnRequestInput } from './returns.schemas'
import { splitAgainstDebt, valueReturning } from './settlement'

interface ResolvedItem {
  saleItem: SaleItem
  quantity: number
  received: boolean
  condition: ItemCondition | null
}

/**
 * Devolução parcial e troca (RN-DEV). Sem troca, o valor das peças abate primeiro o fiado em aberto da venda
 * e o resto vira devolução de valor. Na troca, o valor vira crédito da venda nova (até o total dela); a sobra
 * segue a mesma regra. Tudo numa transação; o `id` é a Idempotency-Key.
 */
export class PartialReturnsService {
  constructor(
    private readonly salesRepo: SalesRepository,
    private readonly sales: SalesService,
    private readonly confirmation: SaleConfirmationService,
    private readonly returnsRepo: ReturnsRepository,
    private readonly refundsRepo: RefundsRepository,
    private readonly receivablesRepo: ReceivablesRepository,
    private readonly receivables: ReceivablesService,
    private readonly stock: StockService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Mostra os valores antes de confirmar: abatimento de fiado, crédito, a devolver e a pagar. */
  async preview(saleId: string, input: ReturnRequestInput) {
    const sale = await this.requireConfirmed(saleId)
    const items = this.resolve(await this.salesRepo.items(saleId), input.items)
    const receivable = await this.receivablesRepo.bySale(saleId)
    const { lines, totalCents } = valueReturning(items)

    const newSale = input.exchange ? await this.previewExchangeSale(sale, input, totalCents) : null
    const creditCents = newSale?.creditCents ?? 0
    const settlement = splitAgainstDebt(totalCents - creditCents, this.openDebt(receivable))
    return {
      type: input.exchange ? 'exchange' : 'partial_return',
      items: lines.map((line) => ({
        saleItemId: line.saleItem.id,
        productName: line.saleItem.productName,
        variantLabel: line.saleItem.variantLabel,
        quantity: line.quantity,
        valueCents: line.valueCents,
      })),
      itemsValueCents: totalCents,
      exchangeCreditCents: creditCents,
      appliedToReceivableCents: settlement.appliedToReceivableCents,
      refundCents: settlement.restCents,
      newSale,
      messages: this.messages(creditCents, settlement.appliedToReceivableCents, settlement.restCents, newSale),
    }
  }

  async execute(id: string, saleId: string, input: ReturnRequestInput, userId: string) {
    const existing = await this.returnsRepo.find(id)
    if (existing) return this.result(existing.saleId, id, true)

    try {
      await db.transaction(async (tx) => {
        const sale = await this.requireConfirmed(saleId, tx)
        const items = this.resolve(await this.salesRepo.items(saleId, tx), input.items)
        const receivable = await this.lockedReceivable(saleId, tx)
        const { totalCents } = valueReturning(items)
        const now = new Date()
        const businessDate = await this.settings.businessDate(now, tx)

        // RN-DEV-05/06: a troca gera uma venda nova, com todas as regras de venda, paga com o crédito.
        let creditCents = 0
        let exchangeSaleId: string | null = null
        if (input.exchange) {
          const draft = await this.salesRepo.insert(
            { createdBy: userId, originReturnId: id, ...this.exchangeFields(sale, input) },
            tx,
          )
          const lines = await this.sales.cartLines(mergeItems(input.exchange.items), tx)
          const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
          await this.salesRepo.replaceItems(
            draft.id,
            lines.map((line) => ({
              variantId: line.variantId,
              productName: line.productName,
              variantLabel: line.variantLabel,
              unitPriceCents: line.unitPriceCents,
              quantity: line.quantity,
              lineSubtotalCents: line.unitPriceCents * line.quantity,
              lineTotalCents: line.unitPriceCents * line.quantity,
            })),
            tx,
          )
          await this.salesRepo.update(draft.id, { subtotalCents: subtotal, totalCents: subtotal }, tx)
          creditCents = Math.min(totalCents, subtotal)
          await this.confirmation.confirmWithin(tx, draft.id, userId, creditCents)
          exchangeSaleId = draft.id
        }

        const { appliedToReceivableCents, restCents } = splitAgainstDebt(
          totalCents - creditCents,
          this.openDebt(receivable),
        )
        const allReceived = items.every((item) => item.received)
        await this.returnsRepo.insert(
          {
            id,
            saleId,
            type: input.exchange ? 'exchange' : 'partial_return',
            status: allReceived ? 'completed' : 'awaiting_items',
            reason: input.reason?.trim() || null,
            itemsValueCents: totalCents,
            appliedToReceivableCents,
            refundCents: restCents,
            exchangeCreditCents: creditCents,
            exchangeSaleId,
            businessDate,
            createdBy: userId,
          },
          tx,
        )
        const returnItems = await this.returnsRepo.insertItems(
          items.map((item) => ({
            returnId: id,
            saleItemId: item.saleItem.id,
            variantId: item.saleItem.variantId,
            quantity: item.quantity,
            status: item.received ? ('received' as const) : ('awaiting' as const),
            condition: item.condition,
            receivedAt: item.received ? now : null,
          })),
          tx,
        )
        for (const item of items) await this.returnsRepo.addReturnedQty(item.saleItem.id, item.quantity, tx)
        // RN-DEV-07: peça apta recebida agora volta ao estoque; avariada fica registrada.
        await this.stock.apply(
          tx,
          returnItems
            .filter((item) => item.condition === 'sellable')
            .map((item) => ({
              variantId: item.variantId,
              type: 'return_in' as const,
              delta: item.quantity,
              refType: 'return_item' as const,
              refId: item.id,
            })),
          { businessDate, userId },
        )

        if (appliedToReceivableCents > 0) {
          await this.receivables.applyAdjustment(tx, receivable!, appliedToReceivableCents, 'items_returned', {
            refType: 'return',
            refId: id,
          })
        }
        if (restCents > 0) {
          await this.refundsRepo.insert({ saleId, source: 'return', sourceId: id, amountCents: restCents }, tx)
        }
        await this.audit.record(
          {
            entity: 'sale',
            entityId: saleId,
            action: input.exchange ? 'exchange' : 'partial_return',
            after: { returnId: id, exchangeSaleId, itemsValueCents: totalCents },
            reason: input.reason ?? null,
            userId,
          },
          tx,
        )
      })
    } catch (error) {
      if (isUniqueViolation(error) && (await this.returnsRepo.find(id))) return this.result(saleId, id, true)
      throw error
    }
    return this.result(saleId, id, false)
  }

  /** Venda nova da troca calculada sem gravar: total, crédito usado, diferença a pagar e bloqueios. */
  private async previewExchangeSale(sale: Sale, input: ReturnRequestInput, returnedValueCents: number) {
    const cartLines = await this.sales.cartLines(mergeItems(input.exchange!.items))
    const subtotal = cartLines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
    const creditCents = Math.min(returnedValueCents, subtotal)
    const cart = this.sales.calculate({ ...sale, ...this.exchangeFields(sale, input) }, cartLines, creditCents)
    return {
      items: cart.lines,
      totalCents: cart.totalCents,
      creditCents,
      toPayCents: cart.totalCents - creditCents,
      fiadoCents: cart.fiadoCents,
      warnings: cart.warnings,
      blockers: cart.blockers,
    }
  }

  private async result(saleId: string, returnId: string, alreadyProcessed: boolean) {
    const ret = await this.returnsRepo.find(returnId)
    return {
      sale: await this.sales.view(saleId),
      exchangeSale: ret?.exchangeSaleId ? await this.sales.view(ret.exchangeSaleId) : null,
      returnId,
      alreadyProcessed,
    }
  }

  /** RN-DEV-01: só peças ainda não devolvidas (`returned_qty` já inclui as que aguardam retorno). */
  private resolve(saleItems: SaleItem[], requested: ReturnRequestInput['items']): ResolvedItem[] {
    const byId = new Map(saleItems.map((item) => [item.id, item]))
    const seen = new Set<string>()
    return requested.map((request) => {
      const saleItem = byId.get(request.saleItemId)
      if (!saleItem) throw new NotFoundError('Item não encontrado nesta venda.')
      if (seen.has(saleItem.id)) throw new ValidationError(`${saleItem.productName} aparece duas vezes na devolução.`)
      seen.add(saleItem.id)
      const available = saleItem.quantity - saleItem.returnedQty
      if (request.quantity > available) {
        const pieces = available === 1 ? '1 peça' : `${available} peças`
        const verb = available === 1 ? 'pode ser devolvida' : 'podem ser devolvidas'
        throw new BusinessRuleError(`Só ${pieces} de ${saleItem.productName} ${saleItem.variantLabel} ainda ${verb}.`)
      }
      if (request.received && !request.condition) {
        throw new ValidationError('Informe se a peça recebida está apta para venda ou avariada.')
      }
      return {
        saleItem,
        quantity: request.quantity,
        received: request.received,
        condition: request.received ? request.condition! : null,
      }
    })
  }

  /** Campos do rascunho da venda da troca: mesma cliente, sem desconto, pagamentos e fiado da diferença. */
  private exchangeFields(sale: Sale, input: ReturnRequestInput) {
    return {
      customerId: sale.customerId,
      discountKind: 'none' as const,
      discountValue: 0,
      draftPayments: (input.exchange?.payments ?? []).map(normalizePayment),
      draftFiado: input.exchange?.fiado ?? false,
      draftFiadoDueDate: input.exchange?.fiadoDueDate ?? null,
    }
  }

  private messages(
    creditCents: number,
    appliedCents: number,
    refundCents: number,
    newSale: { toPayCents: number } | null,
  ) {
    const messages: string[] = []
    if (creditCents > 0) messages.push(`${formatBRL(creditCents)} de crédito na peça nova.`)
    if (newSale && newSale.toPayCents > 0) messages.push(`Diferença a pagar: ${formatBRL(newSale.toPayCents)}.`)
    if (appliedCents > 0) messages.push(`${formatBRL(appliedCents)} abatidos do fiado em aberto.`)
    if (refundCents > 0) messages.push(`${formatBRL(refundCents)} a devolver para a cliente.`)
    return messages
  }

  private openDebt(receivable: Receivable | undefined) {
    return receivable?.status === 'open' ? receivable.balanceCents : 0
  }

  private async lockedReceivable(saleId: string, tx: DbOrTx) {
    const receivable = await this.receivablesRepo.bySale(saleId, tx)
    return receivable ? this.receivablesRepo.find(receivable.id, tx, true) : undefined
  }

  private async requireConfirmed(saleId: string, tx?: DbOrTx) {
    const sale = await this.sales.require(saleId, tx, Boolean(tx))
    if (sale.status === 'draft') throw new BusinessRuleError('Rascunho não tem devolução: edite o carrinho.')
    if (sale.status === 'cancelled') throw new BusinessRuleError('Esta venda foi cancelada.')
    return sale
  }
}

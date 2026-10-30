import { formatBRL } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import type { Receivable, Sale, SaleItem } from '../../db/schema'
import { BusinessRuleError, ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { ReceivablesRepository } from '../receivables/receivables.repository'
import type { ReceivablesService } from '../receivables/receivables.service'
import type { RefundsRepository } from '../returns/refunds.repository'
import type { ReturnsRepository } from '../returns/returns.repository'
import { splitAgainstDebt, valueReturning } from '../returns/settlement'
import type { SalesRepository } from '../sales/sales.repository'
import type { SalesService } from '../sales/sales.service'
import type { SettingsService } from '../settings/settings.service'
import type { StockService } from '../stock/stock.service'

const units = (n: number) => `${n} ${n === 1 ? 'peça' : 'peças'}`

/** RN-CAN-03: com envio aguardando, as peças estão com a loja; enviadas/entregues, com a cliente; sem envio, a dona diz. */
function defaultItemsWithStore(sale: Sale): boolean | null {
  if (sale.shippingStatus === 'pending') return true
  if (sale.shippingStatus === 'shipped' || sale.shippingStatus === 'delivered') return false
  return null
}

/**
 * Cancelamento de venda confirmada (RN-CAN). Considera só as peças ainda não devolvidas; o valor delas abate
 * primeiro o fiado em aberto e o restante vira devolução de valor pendente. Recebimentos já feitos ficam onde estão.
 */
export class CancellationsService {
  constructor(
    private readonly salesRepo: SalesRepository,
    private readonly sales: SalesService,
    private readonly returnsRepo: ReturnsRepository,
    private readonly refundsRepo: RefundsRepository,
    private readonly receivablesRepo: ReceivablesRepository,
    private readonly receivables: ReceivablesService,
    private readonly stock: StockService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** RN-CAN-02: o que vai acontecer, antes de confirmar. */
  async preview(saleId: string, itemsWithStore?: boolean) {
    const sale = await this.sales.require(saleId)
    this.assertCancellable(sale)
    const items = await this.salesRepo.items(saleId)
    return this.plan(sale, items, await this.receivablesRepo.bySale(saleId), itemsWithStore)
  }

  async cancel(saleId: string, input: { reason: string; itemsWithStore: boolean }, userId: string) {
    const reason = input.reason.trim()
    if (!reason) throw new ValidationError('Informe o motivo do cancelamento.', { field: 'reason' })

    const result = await db.transaction(async (tx) => {
      const sale = await this.sales.require(saleId, tx, true)
      if (sale.status === 'cancelled') return { alreadyProcessed: true, effects: null }
      this.assertCancellable(sale)

      const items = await this.salesRepo.items(saleId, tx)
      const receivable = await this.lockedReceivable(saleId, tx)
      const plan = this.plan(sale, items, receivable, input.itemsWithStore)
      const now = new Date()
      const context = { businessDate: await this.settings.businessDate(now, tx), userId }

      const ret = await this.returnsRepo.insert(
        {
          saleId,
          type: 'cancellation',
          status: input.itemsWithStore ? 'completed' : 'awaiting_items',
          reason,
          itemsValueCents: plan.itemsValueCents,
          appliedToReceivableCents: plan.receivableCancelledCents,
          refundCents: plan.refundCents,
          businessDate: context.businessDate,
          createdBy: userId,
        },
        tx,
      )
      // RN-CAN-04: peças com a loja voltam ao estoque uma única vez; com a cliente, ficam aguardando retorno.
      const returnItems = await this.returnsRepo.insertItems(
        plan.items.map((item) => ({
          returnId: ret.id,
          saleItemId: item.saleItemId,
          variantId: item.variantId,
          quantity: item.quantity,
          status: input.itemsWithStore ? ('received' as const) : ('awaiting' as const),
          condition: input.itemsWithStore ? ('sellable' as const) : null,
          receivedAt: input.itemsWithStore ? now : null,
        })),
        tx,
      )
      for (const item of plan.items) await this.returnsRepo.addReturnedQty(item.saleItemId, item.quantity, tx)
      if (input.itemsWithStore) {
        await this.stock.apply(
          tx,
          returnItems.map((item) => ({
            variantId: item.variantId,
            type: 'sale_cancel_return' as const,
            delta: item.quantity,
            refType: 'return_item' as const,
            refId: item.id,
          })),
          context,
        )
      }

      await this.salesRepo.update(
        saleId,
        { status: 'cancelled', cancelledAt: now, cancelReason: reason, cancelledBy: userId, version: sale.version + 1 },
        tx,
      )
      if (plan.receivableCancelledCents > 0) {
        await this.receivables.applyAdjustment(tx, receivable!, plan.receivableCancelledCents, 'sale_cancelled', {
          refType: 'sale',
          refId: saleId,
        })
      }
      // RN-CAN-06: devolver o dinheiro é outro registro; o sistema não estorna na maquininha nem no banco.
      if (plan.refundCents > 0) {
        await this.refundsRepo.insert(
          { saleId, source: 'cancellation', sourceId: saleId, amountCents: plan.refundCents },
          tx,
        )
      }
      await this.audit.record({ entity: 'sale', entityId: saleId, action: 'cancel', after: plan, reason, userId }, tx)
      return { alreadyProcessed: false, effects: plan }
    })

    return { ...(await this.sales.view(saleId)), ...result }
  }

  private plan(sale: Sale, items: SaleItem[], receivable: Receivable | undefined, itemsWithStore?: boolean) {
    const defaultWithStore = defaultItemsWithStore(sale)
    const withStore = itemsWithStore ?? defaultWithStore
    const remaining = items
      .filter((item) => item.quantity - item.returnedQty > 0)
      .map((saleItem) => ({ saleItem, quantity: saleItem.quantity - saleItem.returnedQty }))
    if (remaining.length === 0) {
      throw new BusinessRuleError('Todas as peças desta venda já foram devolvidas ou trocadas; não há o que cancelar.')
    }

    const { lines, totalCents } = valueReturning(remaining)
    const openDebt = receivable?.status === 'open' ? receivable.balanceCents : 0
    const { appliedToReceivableCents, restCents } = splitAgainstDebt(totalCents, openDebt)
    const pieces = remaining.reduce((sum, item) => sum + item.quantity, 0)

    const messages: string[] = []
    const plural = pieces > 1
    if (withStore === true) messages.push(`${units(pieces)} ${plural ? 'voltam' : 'volta'} ao estoque.`)
    if (withStore === false) {
      messages.push(`${units(pieces)} ${plural ? 'ficam' : 'fica'} aguardando retorno da cliente.`)
    }
    if (appliedToReceivableCents > 0) messages.push(`Fiado de ${formatBRL(appliedToReceivableCents)} cancelado.`)
    if (restCents > 0) messages.push(`${formatBRL(restCents)} a devolver para a cliente.`)

    return {
      itemsWithStoreDefault: defaultWithStore,
      itemsWithStore: withStore,
      /** Sem envio registrado, a dona precisa dizer onde estão as peças antes de confirmar. */
      needsItemsLocation: withStore === null,
      items: lines.map((line) => ({
        saleItemId: line.saleItem.id,
        variantId: line.saleItem.variantId,
        productName: line.saleItem.productName,
        variantLabel: line.saleItem.variantLabel,
        quantity: line.quantity,
        valueCents: line.valueCents,
      })),
      piecesBackToStock: withStore === true ? pieces : 0,
      piecesAwaitingReturn: withStore === false ? pieces : 0,
      itemsValueCents: totalCents,
      receivableCancelledCents: appliedToReceivableCents,
      refundCents: restCents,
      messages,
    }
  }

  private assertCancellable(sale: Sale) {
    if (sale.status === 'draft') throw new BusinessRuleError('Rascunho não é cancelado: descarte-o.')
    if (sale.status === 'cancelled') throw new BusinessRuleError('Esta venda já foi cancelada.')
  }

  private async lockedReceivable(saleId: string, tx: DbOrTx) {
    const receivable = await this.receivablesRepo.bySale(saleId, tx)
    return receivable ? this.receivablesRepo.find(receivable.id, tx, true) : undefined
  }
}

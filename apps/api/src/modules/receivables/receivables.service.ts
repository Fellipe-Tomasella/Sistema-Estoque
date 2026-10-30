import { isOverdue } from '@estoque/shared'
import type { DbOrTx } from '../../db/client'
import type { Receivable } from '../../db/schema'
import { BusinessRuleError, NotFoundError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { CustomersService } from '../customers/customers.service'
import type { PaymentsRepository } from '../payments/payments.repository'
import type { SalesRepository } from '../sales/sales.repository'
import type { SettingsService } from '../settings/settings.service'
import type { ReceivablesRepository } from './receivables.repository'

/** Dívidas do fiado (RN-FIA-01…03, 06) e manutenção dos saldos e da situação de pagamento da venda. */
export class ReceivablesService {
  constructor(
    private readonly repo: ReceivablesRepository,
    private readonly payments: PaymentsRepository,
    private readonly sales: SalesRepository,
    private readonly customers: CustomersService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** RN-FIA-02: por cliente, dívidas com origem, valor original, recebimentos, ajustes, saldo e data combinada. */
  async byCustomer(customerId: string) {
    const customer = await this.customers.get(customerId)
    const today = await this.settings.businessDate()
    const debts = await this.repo.byCustomer(customerId)
    const ids = debts.map((d) => d.id)
    const allocations = Map.groupBy(await this.repo.allocationsFor(ids), (a) => a.receivableId)
    const adjustments = Map.groupBy(await this.repo.adjustmentsFor(ids), (a) => a.receivableId)
    const items = debts.map((debt) => ({
      ...debt,
      overdue: debt.status === 'open' && isOverdue(debt.balanceCents, debt.dueDate, today),
      receipts: allocations.get(debt.id) ?? [],
      adjustments: adjustments.get(debt.id) ?? [],
    }))
    const open = items.filter((d) => d.status === 'open')
    return {
      customer,
      openBalanceCents: open.reduce((sum, d) => sum + d.balanceCents, 0),
      overdue: open.some((d) => d.overdue),
      receivables: items,
    }
  }

  async updateDueDate(id: string, dueDate: string | null, userId: string) {
    const receivable = await this.repo.find(id)
    if (!receivable) throw new NotFoundError('Dívida não encontrada.')
    if (receivable.status !== 'open') throw new BusinessRuleError('Esta dívida não está mais em aberto.')
    const updated = await this.repo.update(id, { dueDate })
    await this.audit.record({
      entity: 'receivable',
      entityId: id,
      action: 'due_date',
      before: { dueDate: receivable.dueDate },
      after: { dueDate },
      userId,
    })
    return updated
  }

  /**
   * Soma (ou desfaz) um abatimento na dívida já travada: quitada quando o saldo chega a 0, reaberta se voltar
   * a ter saldo (RN-FIA-06/07). Atualiza também a situação de pagamento da venda de origem.
   */
  async applyPaid(tx: DbOrTx, receivable: Receivable, deltaCents: number) {
    const paidCents = receivable.paidCents + deltaCents
    const balance = receivable.originalCents - paidCents - receivable.adjustedCents
    const updated = await this.repo.update(
      receivable.id,
      {
        paidCents,
        ...(receivable.status === 'cancelled'
          ? {}
          : { status: balance === 0 ? 'settled' : 'open', settledAt: balance === 0 ? new Date() : null }),
      },
      tx,
    )
    await this.syncSalePaymentStatus(tx, updated)
    return updated
  }

  /**
   * Abate a dívida já travada sem pagamento: cancelamento ou devolução de peças (RN-CAN-05, RN-DEV-04).
   * Zerada por cancelamento, a dívida fica `cancelled`; por devolução, `settled`.
   */
  async applyAdjustment(
    tx: DbOrTx,
    receivable: Receivable,
    amountCents: number,
    reason: 'sale_cancelled' | 'items_returned',
    ref: { refType: string; refId: string },
  ) {
    await this.repo.insertAdjustment({ receivableId: receivable.id, amountCents, reason, ...ref }, tx)
    const adjustedCents = receivable.adjustedCents + amountCents
    const balance = receivable.originalCents - receivable.paidCents - adjustedCents
    const closedStatus = reason === 'sale_cancelled' ? 'cancelled' : 'settled'
    const updated = await this.repo.update(
      receivable.id,
      {
        adjustedCents,
        status: balance === 0 ? closedStatus : 'open',
        settledAt: balance === 0 ? new Date() : null,
      },
      tx,
    )
    await this.syncSalePaymentStatus(tx, updated)
    return updated
  }

  /** `paid` sem saldo em aberto; `partially_paid` se algo já entrou; senão `unpaid`. */
  async syncSalePaymentStatus(tx: DbOrTx, receivable: Receivable) {
    if (!receivable.saleId) return
    const sale = await this.sales.find(receivable.saleId, tx)
    if (!sale || sale.status !== 'confirmed') return
    const checkoutCents = (await this.payments.bySale(sale.id, tx))
      .filter((p) => p.status === 'valid' && p.kind !== 'receivable_receipt')
      .reduce((sum, p) => sum + p.amountCents, 0)
    const paymentStatus =
      receivable.balanceCents === 0 ? 'paid' : checkoutCents + receivable.paidCents > 0 ? 'partially_paid' : 'unpaid'
    if (paymentStatus !== sale.paymentStatus) await this.sales.update(sale.id, { paymentStatus }, tx)
  }
}

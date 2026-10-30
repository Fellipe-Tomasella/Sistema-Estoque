import type { MoneyMethod, RefundStatus } from '@estoque/shared'
import { db } from '../../db/client'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { SettingsService } from '../settings/settings.service'
import type { RefundsRepository } from './refunds.repository'

/**
 * Devolução de valor à cliente (RN-DEV-08): pendente até a dona registrar que devolveu (forma e data),
 * e só então entra no fechamento daquele dia como saída. Pode ser anulada com motivo.
 */
export class RefundsService {
  constructor(
    private readonly repo: RefundsRepository,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async list(status?: RefundStatus) {
    const rows = await this.repo.list(status)
    return rows.map(({ refund, saleNumber, customer }) => ({
      ...refund,
      saleNumber,
      customerName: customer?.name ?? null,
    }))
  }

  async markDone(id: string, input: { method: MoneyMethod; date?: string }, userId: string) {
    const today = await this.settings.businessDate()
    const date = input.date ?? today
    if (date > today) throw new ValidationError('A data da devolução não pode ser no futuro.', { field: 'date' })

    return db.transaction(async (tx) => {
      const refund = await this.require(id, tx)
      if (refund.status === 'done') return refund
      if (refund.status === 'cancelled') throw new BusinessRuleError('Esta devolução de valor foi anulada.')
      const updated = await this.repo.update(
        id,
        { status: 'done', method: input.method, doneAt: new Date(), businessDate: date },
        tx,
      )
      await this.audit.record(
        {
          entity: 'sale',
          entityId: refund.saleId,
          action: 'refund_done',
          after: { refundId: id, method: input.method, date },
          userId,
        },
        tx,
      )
      return updated
    })
  }

  async cancel(id: string, reason: string, userId: string) {
    return db.transaction(async (tx) => {
      const refund = await this.require(id, tx)
      if (refund.status === 'cancelled') return refund
      const updated = await this.repo.update(id, { status: 'cancelled', cancelReason: reason.trim() }, tx)
      await this.audit.record(
        {
          entity: 'sale',
          entityId: refund.saleId,
          action: 'refund_cancelled',
          after: { refundId: id },
          reason,
          userId,
        },
        tx,
      )
      return updated
    })
  }

  private async require(id: string, tx: Parameters<RefundsRepository['find']>[1]) {
    const refund = await this.repo.find(id, tx, true)
    if (!refund) throw new NotFoundError('Devolução de valor não encontrada.')
    return refund
  }
}

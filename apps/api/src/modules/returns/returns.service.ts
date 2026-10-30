import type { ItemCondition } from '@estoque/shared'
import { db } from '../../db/client'
import { NotFoundError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { SettingsService } from '../settings/settings.service'
import type { StockService } from '../stock/stock.service'
import type { ReturnsRepository } from './returns.repository'

/** Retorno físico das peças (RN-DEV-07) e a lista de pendências de retorno. */
export class ReturnsService {
  constructor(
    private readonly repo: ReturnsRepository,
    private readonly stock: StockService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  awaiting() {
    return this.repo.awaiting()
  }

  /**
   * Peça recebida: apta volta ao estoque (uma vez por item); avariada fica registrada e não volta.
   * Quando todos os itens chegam, a devolução fica concluída. Repetir não tem efeito.
   */
  async receiveItem(returnId: string, itemId: string, condition: ItemCondition, userId: string) {
    await db.transaction(async (tx) => {
      const ret = await this.repo.find(returnId, tx, true)
      const item = ret && (await this.repo.findItem(itemId, tx, true))
      if (!ret || !item || item.returnId !== returnId) throw new NotFoundError('Peça não encontrada nesta devolução.')
      if (item.status === 'received') return

      const now = new Date()
      await this.repo.updateItem(itemId, { status: 'received', condition, receivedAt: now }, tx)
      if (condition === 'sellable') {
        await this.stock.apply(
          tx,
          [
            {
              variantId: item.variantId,
              type: 'return_in',
              delta: item.quantity,
              refType: 'return_item',
              refId: item.id,
            },
          ],
          { businessDate: await this.settings.businessDate(now, tx), userId },
        )
      }
      if ((await this.repo.countAwaiting(returnId, tx)) === 0)
        await this.repo.update(returnId, { status: 'completed' }, tx)
      await this.audit.record(
        { entity: 'sale', entityId: ret.saleId, action: 'item_received', after: { itemId, condition }, userId },
        tx,
      )
    })
    const ret = await this.repo.find(returnId)
    return (await this.repo.bySale(ret!.saleId)).find((r) => r.id === returnId)!
  }
}

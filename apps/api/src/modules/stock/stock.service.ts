import { type AdjustmentReason, ErrorCode, type StockMovementType, type StockRefType } from '@estoque/shared'
import type { DbOrTx } from '../../db/client'
import type { StockMovement } from '../../db/schema'
import { BusinessRuleError, NotFoundError } from '../../shared/errors'
import type { StockRepository } from './stock.repository'

export interface MovementInput {
  variantId: string
  type: StockMovementType
  /** Positivo = entra, negativo = sai. Nunca 0. */
  delta: number
  refType?: StockRefType | null
  refId?: string | null
  adjustmentReason?: AdjustmentReason | null
  countedQty?: number | null
  note?: string | null
}

export interface MovementContext {
  businessDate: string
  userId: string | null
}

export const variantLabel = (v: { productName: string; color: string; size: string }) =>
  `${v.productName} ${v.color}/${v.size}`

const units = (n: number) => `${n} ${n === 1 ? 'unidade' : 'unidades'}`

/**
 * Único caminho para mudar o estoque (RN-EST-01). Roda dentro da transação de quem chama:
 * trava as variações, confere saldo, grava o ledger e atualiza `variants.stock_qty`.
 */
export class StockService {
  constructor(private readonly repo: StockRepository) {}

  async apply(tx: DbOrTx, movements: MovementInput[], context: MovementContext): Promise<StockMovement[]> {
    if (movements.length === 0) return []
    const ids = [...new Set(movements.map((m) => m.variantId))].sort()
    const locked = await this.repo.lockVariants(ids, tx)
    const balances = new Map(locked.map((v) => [v.id, v.stockQty]))

    const rows = movements.map((movement) => {
      const current = balances.get(movement.variantId)
      if (current === undefined) throw new NotFoundError('Variação não encontrada.')
      if (movement.delta === 0 || !Number.isInteger(movement.delta)) {
        throw new BusinessRuleError('Quantidade do movimento inválida.')
      }
      const balanceAfter = current + movement.delta
      if (balanceAfter < 0) {
        const variant = locked.find((v) => v.id === movement.variantId)!
        throw new BusinessRuleError(
          `Só há ${units(current)} de ${variantLabel(variant)}.`,
          ErrorCode.INSUFFICIENT_STOCK,
          { variantId: movement.variantId, available: current, requested: -movement.delta },
        )
      }
      balances.set(movement.variantId, balanceAfter)
      return {
        variantId: movement.variantId,
        type: movement.type,
        quantityDelta: movement.delta,
        balanceAfter,
        adjustmentReason: movement.adjustmentReason ?? null,
        countedQty: movement.countedQty ?? null,
        note: movement.note ?? null,
        refType: movement.refType ?? null,
        refId: movement.refId ?? null,
        businessDate: context.businessDate,
        createdBy: context.userId,
      }
    })

    for (const [variantId, stockQty] of balances) await this.repo.setStockQty(variantId, stockQty, tx)
    return this.repo.insertMovements(rows, tx)
  }

  hasMovements(variantIds: string[], tx?: DbOrTx) {
    return this.repo.hasMovements(variantIds, tx)
  }
}

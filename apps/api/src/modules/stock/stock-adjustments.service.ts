import { db } from '../../db/client'
import type { StockMovement } from '../../db/schema'
import { ValidationError } from '../../shared/errors'
import { isUniqueViolation } from '../../shared/sql'
import type { AuditService } from '../audit/audit.service'
import type { SettingsService } from '../settings/settings.service'
import type { CreateAdjustmentInput } from './stock.schemas'
import type { StockService } from './stock.service'

export interface AdjustmentResult {
  changed: boolean
  message: string
  movement: StockMovement | null
  alreadyProcessed: boolean
}

const describe = (movement: StockMovement) => {
  const signed = movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : String(movement.quantityDelta)
  return `Acerto salvo: ${signed}. Saldo agora: ${movement.balanceAfter}.`
}

/** Acertos de estoque (RN-EST-05/06): contagem define o saldo; perda/avaria/erro/outro somam ou tiram. */
export class StockAdjustmentsService {
  constructor(
    private readonly stock: StockService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async create(id: string, input: CreateAdjustmentInput, userId: string): Promise<AdjustmentResult> {
    const existing = await this.stock.findMovement(id)
    if (existing) return { changed: true, message: describe(existing), movement: existing, alreadyProcessed: true }

    const note = input.note?.trim() || null
    this.validate(input, note)

    try {
      const movement = await db.transaction(async (tx) => {
        const context = { businessDate: await this.settings.businessDate(new Date(), tx), userId }
        const created =
          input.reason === 'count'
            ? await this.stock.countTo(
                tx,
                { id, variantId: input.variantId, countedQty: input.countedQty!, note },
                context,
              )
            : (
                await this.stock.apply(
                  tx,
                  [
                    {
                      id,
                      variantId: input.variantId,
                      type: 'adjustment',
                      delta: input.quantityDelta!,
                      adjustmentReason: input.reason,
                      refType: 'manual',
                      note,
                    },
                  ],
                  context,
                )
              )[0]!
        if (created) {
          await this.audit.record(
            {
              entity: 'variant',
              entityId: input.variantId,
              action: 'stock_adjustment',
              after: {
                reason: input.reason,
                quantityDelta: created.quantityDelta,
                countedQty: created.countedQty,
                balanceAfter: created.balanceAfter,
              },
              reason: note,
              userId,
            },
            tx,
          )
        }
        return created
      })
      if (!movement)
        return { changed: false, message: 'O saldo já está correto.', movement: null, alreadyProcessed: false }
      return { changed: true, message: describe(movement), movement, alreadyProcessed: false }
    } catch (error) {
      if (isUniqueViolation(error)) return this.create(id, input, userId)
      throw error
    }
  }

  private validate(input: CreateAdjustmentInput, note: string | null) {
    if (input.reason === 'count') {
      if (input.countedQty === undefined) {
        throw new ValidationError('Informe quantas peças você contou.', { field: 'countedQty' })
      }
      return
    }
    if (!input.quantityDelta) {
      throw new ValidationError('Informe quantas peças tirar ou acrescentar.', { field: 'quantityDelta' })
    }
    if (input.reason === 'other' && !note) {
      throw new ValidationError('Descreva o motivo na observação.', { field: 'note' })
    }
  }
}

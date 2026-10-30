import { db } from '../../db/client'
import { NotFoundError, ValidationError } from '../../shared/errors'
import { isUniqueViolation } from '../../shared/sql'
import type { SettingsService } from '../settings/settings.service'
import type { EntryFilters, StockEntriesRepository } from './stock-entries.repository'
import type { CreateEntryInput } from './stock.schemas'
import type { StockService } from './stock.service'

/** Entrada de mercadoria (RN-EST-03/04): lançada uma vez, nunca editada; erro se corrige com acerto. */
export class StockEntriesService {
  constructor(
    private readonly repo: StockEntriesRepository,
    private readonly stock: StockService,
    private readonly settings: SettingsService,
  ) {}

  async create(id: string, input: CreateEntryInput, userId: string) {
    const existing = await this.repo.find(id)
    if (existing) return { ...existing, alreadyProcessed: true }

    if (input.entryDate > (await this.settings.businessDate())) {
      throw new ValidationError('A data da entrada não pode ser no futuro.', { field: 'entryDate' })
    }

    try {
      await db.transaction(async (tx) => {
        await this.repo.insert(
          {
            id,
            entryDate: input.entryDate,
            supplierName: input.supplierName?.trim() || null,
            reference: input.reference?.trim() || null,
            notes: input.notes?.trim() || null,
            createdBy: userId,
          },
          input.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitCostCents: item.unitCostCents ?? null,
          })),
          tx,
        )
        await this.stock.apply(
          tx,
          input.items.map((item) => ({
            variantId: item.variantId,
            type: 'purchase_entry' as const,
            delta: item.quantity,
            refType: 'stock_entry' as const,
            refId: id,
          })),
          { businessDate: input.entryDate, userId },
        )
      })
    } catch (error) {
      // Mesma chave enviada ao mesmo tempo por dois aparelhos: vale a primeira.
      if (isUniqueViolation(error)) return { ...(await this.get(id)), alreadyProcessed: true }
      throw error
    }
    return { ...(await this.get(id)), alreadyProcessed: false }
  }

  async get(id: string) {
    const entry = await this.repo.find(id)
    if (!entry) throw new NotFoundError('Entrada não encontrada.')
    return entry
  }

  list(filters: EntryFilters) {
    return this.repo.list(filters)
  }
}

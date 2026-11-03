import { db } from '../../db/client'
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors'
import { isUniqueViolation } from '../../shared/sql'
import type { SettingsService } from '../settings/settings.service'
import type { EntryFilters, StockEntriesRepository } from './stock-entries.repository'
import { readNfe } from './nfe-reader'
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
            nfeAccessKey: input.nfe?.accessKey ?? null,
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
        if (input.nfe) await this.repo.saveLinks(input.nfe.supplierDocument, input.nfe.links, tx)
      })
    } catch (error) {
      if (isUniqueViolation(error, 'stock_entries_nfeAccessKey_unique')) {
        throw new ConflictError('Esta nota fiscal já foi lançada no estoque.')
      }
      // Mesma chave enviada ao mesmo tempo por dois aparelhos: vale a primeira.
      if (isUniqueViolation(error)) return { ...(await this.get(id)), alreadyProcessed: true }
      throw error
    }
    return { ...(await this.get(id)), alreadyProcessed: false }
  }

  /**
   * RN-EST-11: lê o XML da NF-e do fornecedor e sugere a variação de cada item (vínculo lembrado da nota
   * anterior, código de barras ou SKU). Não grava nada: a dona confere e lança como uma entrada normal.
   */
  async previewNfe(file: Blob) {
    const doc = readNfe(await file.text())
    if (doc.accessKey) {
      const existing = await this.repo.findByAccessKey(doc.accessKey)
      if (existing) {
        throw new ConflictError(`Esta nota já foi lançada no estoque (entrada de ${existing.entryDate}).`, {
          entryId: existing.id,
        })
      }
    }
    const codes = doc.items.map((i) => i.code)
    const barcodes = doc.items.flatMap((i) => (i.barcode ? [i.barcode] : []))
    const found = await this.repo.nfeCandidates(doc.supplier.document, codes, barcodes)
    const label = (v: { productName: string; color: string; size: string; variantId: string }) => ({
      variantId: v.variantId,
      productName: v.productName,
      label: `${v.color} / ${v.size}`,
    })
    return {
      ...doc,
      items: doc.items.map((item) => {
        const link = found.links.find((l) => l.supplierCode === item.code)
        const barcode = item.barcode ? found.byBarcode.find((v) => v.barcode === item.barcode) : undefined
        const sku = found.bySku.find((v) => v.sku?.toLowerCase() === item.code.toLowerCase())
        const match = link
          ? { ...label(link), by: 'link' as const }
          : barcode
            ? { ...label(barcode), by: 'barcode' as const }
            : sku
              ? { ...label(sku), by: 'sku' as const }
              : null
        return { ...item, match }
      }),
    }
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

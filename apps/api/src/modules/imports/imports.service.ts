import { db, type DbOrTx } from '../../db/client'
import type { ImportBatch } from '../../db/schema'
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { ProductsService } from '../products/products.service'
import { buildPlan, type ImportRow, MAX_ROWS, parseRows, REQUIRED_COLUMNS, summarize } from './import-rows'
import { buildTemplate } from './import-template'
import type { ImportsRepository } from './imports.repository'
import { readSpreadsheet } from './spreadsheet-reader'

interface StoredPreview {
  rows: ImportRow[]
}

const errorsOf = (rows: ImportRow[]) =>
  rows.filter((r) => r.errors.length > 0).map((r) => ({ line: r.line, message: r.errors.join('; ') }))

/** Importação da planilha inicial (RN-IMP): prévia sem gravar estoque, depois efetivar uma única vez. */
export class ImportsService {
  constructor(
    private readonly repo: ImportsRepository,
    private readonly products: ProductsService,
    private readonly audit: AuditService,
  ) {}

  template() {
    return buildTemplate()
  }

  async preview(file: File, userId: string) {
    const { headers, rows: rawRows } = await readSpreadsheet(file)
    const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))
    if (missing.length > 0) {
      throw new ValidationError(`Faltam colunas obrigatórias na planilha: ${missing.join(', ')}. Use o modelo.`)
    }
    if (rawRows.length === 0) throw new ValidationError('A planilha não tem linhas preenchidas.')
    if (rawRows.length > MAX_ROWS) throw new ValidationError(`A planilha passa do limite de ${MAX_ROWS} linhas.`)

    const rows = parseRows(rawRows)
    const { groups, conflicts } = buildPlan(rows, await this.repo.catalog())
    for (const conflict of conflicts) rows.find((r) => r.line === conflict.line)!.errors.push(conflict.message)

    const errors = errorsOf(rows)
    const summary = summarize(groups, errors.length, rows.length)
    const batch = await this.repo.insert({
      fileName: file.name,
      preview: { rows } satisfies StoredPreview,
      summary,
      createdBy: userId,
    })
    return { batchId: batch.id, summary, groups, errors }
  }

  /** Efetiva o lote numa transação. Repetir devolve o resultado já gravado (RN-IMP-05). */
  async commit(batchId: string, skipErrorRows: boolean, userId: string) {
    return db.transaction(async (tx) => {
      const batch = await this.requireBatch(batchId, tx)
      if (batch.status === 'committed') return { ...(batch.result as object), alreadyProcessed: true }
      if (batch.status === 'discarded')
        throw new BusinessRuleError('Esta importação foi descartada. Envie o arquivo de novo.')

      const { rows } = batch.preview as StoredPreview
      const errorRows = rows.filter((r) => r.errors.length > 0)
      if (errorRows.length > 0 && !skipErrorRows) {
        throw new BusinessRuleError(
          `A planilha tem ${errorRows.length} ${errorRows.length === 1 ? 'linha' : 'linhas'} com erro. ` +
            'Corrija o arquivo ou confirme que quer ignorá-las.',
        )
      }

      // O catálogo pode ter mudado desde a prévia: o plano é refeito sobre o estado atual.
      const { groups, conflicts } = buildPlan(rows, await this.repo.catalog(tx))
      if (conflicts.length > 0) {
        throw new ConflictError('O estoque mudou desde a prévia. Envie o arquivo de novo para conferir.', { conflicts })
      }

      const origin = { refType: 'import' as const, refId: batchId }
      for (const group of groups) {
        const variants = group.variants.map((v) => ({
          color: v.color,
          size: v.size,
          priceCents: v.priceCents,
          costCents: v.costCents,
          initialQty: v.quantity,
          minStock: v.minStock,
        }))
        if (group.existingProductId) {
          await this.products.addVariantsWithin(tx, group.existingProductId, variants, userId, origin)
        } else {
          const { name, basePriceCents, reference, category } = group
          await this.products.createWithin(tx, { name, basePriceCents, reference, category, variants }, userId, origin)
        }
      }

      const summary = summarize(groups, errorRows.length, rows.length)
      const result = {
        productsCreated: summary.productsToCreate,
        productsUpdated: summary.productsToUpdate,
        variantsCreated: summary.variants,
        units: summary.units,
        skippedRows: errorRows.length,
      }
      await this.repo.update(batchId, { status: 'committed', committedAt: new Date(), result }, tx)
      await this.audit.record(
        { entity: 'import_batch', entityId: batchId, action: 'commit', after: result, userId },
        tx,
      )
      return { ...result, alreadyProcessed: false }
    })
  }

  async discard(batchId: string) {
    const batch = await this.requireBatch(batchId)
    if (batch.status === 'committed') throw new BusinessRuleError('Esta importação já foi efetivada.')
    await this.repo.update(batchId, { status: 'discarded' })
    return { ok: true }
  }

  /** Dentro de uma transação, trava o lote para que duas confirmações simultâneas não importem duas vezes. */
  private async requireBatch(id: string, tx?: DbOrTx): Promise<ImportBatch> {
    const batch = await this.repo.find(id, tx, tx !== undefined)
    if (!batch) throw new NotFoundError('Importação não encontrada.')
    return batch
  }
}

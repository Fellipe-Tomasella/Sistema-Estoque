import { onlyDigits } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import { formatSaleNumber } from '../sales/sale-view'
import type { SalesRepository } from '../sales/sales.repository'
import type { SettingsService } from '../settings/settings.service'
import type { FiscalRepository } from './fiscal.repository'
import type { RegisterDocumentInput, UpdateDocumentInput } from './fiscal.schemas'

const RULES_PENDING = 'Regras fiscais aguardando validação do contador.'

/**
 * Parte fiscal da v1 (docs/07): o sistema organiza e sinaliza; a dona emite no emissor que já usa e registra aqui.
 * Nada fiscal cria venda, dívida ou movimento de estoque (RN-FIS-08).
 */
export class FiscalService {
  constructor(
    private readonly repo: FiscalRepository,
    private readonly sales: SalesRepository,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Pendências fiscais: vendas sem nota que precisam (ou devem ser revistas) e notas a cancelar no emissor. */
  async pending() {
    const [salesWithout, toCancel, store] = await Promise.all([
      this.repo.salesWithoutDocument(),
      this.repo.cancelPending(),
      this.settings.get(),
    ])
    return {
      // RN-FIS-07: faixa de aviso enquanto o contador não validar as regras.
      rulesValidated: store.fiscalRulesValidated,
      banner: store.fiscalRulesValidated ? null : RULES_PENDING,
      salesWithoutDocument: salesWithout.map((s) => ({
        ...s,
        numberLabel: formatSaleNumber(s.number),
        customerName: s.customer?.name ?? null,
      })),
      cancelPending: toCancel.map(({ doc, saleNumber }) => ({
        ...doc,
        saleNumberLabel: formatSaleNumber(saleNumber),
        message: 'Cancele a nota no emissor e registre aqui.',
      })),
    }
  }

  /** RN-FIS-06: registro manual da nota emitida fora do sistema. */
  async register(saleId: string, input: RegisterDocumentInput, userId: string) {
    const sale = await this.sales.find(saleId)
    if (!sale) throw new NotFoundError('Venda não encontrada.')
    if (sale.status !== 'confirmed') throw new BusinessRuleError('Só é possível registrar nota em venda confirmada.')
    const doc = await this.repo.insert({
      saleId,
      docType: input.docType,
      number: input.number.trim(),
      series: input.series?.trim() || null,
      accessKey: normalizeAccessKey(input.accessKey),
      issuedAt: input.issuedAt,
      notes: input.notes?.trim() || null,
      createdBy: userId,
    })
    await this.audit.record({ entity: 'sale', entityId: saleId, action: 'fiscal_registered', after: doc, userId })
    return doc
  }

  /** Corrige dados ou registra o cancelamento feito no emissor. O sistema nunca cancela a nota sozinho. */
  async update(id: string, input: UpdateDocumentInput, userId: string) {
    return db.transaction(async (tx) => {
      const before = await this.repo.find(id, tx, true)
      if (!before) throw new NotFoundError('Nota não encontrada.')
      const changes: Parameters<FiscalRepository['update']>[1] = {}
      if (input.docType) changes.docType = input.docType
      if (input.number) changes.number = input.number.trim()
      if ('series' in input) changes.series = input.series?.trim() || null
      if ('accessKey' in input) changes.accessKey = normalizeAccessKey(input.accessKey)
      if (input.issuedAt) changes.issuedAt = input.issuedAt
      if ('notes' in input) changes.notes = input.notes?.trim() || null
      if (input.cancelled) {
        if (before.status === 'cancelled') throw new BusinessRuleError('Esta nota já está registrada como cancelada.')
        changes.status = 'cancelled'
        changes.cancelledAt = input.cancelledAt ?? (await this.settings.businessDate())
      }
      const after = await this.repo.update(id, changes, tx)
      await this.audit.record(
        {
          entity: 'sale',
          entityId: before.saleId,
          action: input.cancelled ? 'fiscal_cancelled' : 'fiscal_updated',
          before,
          after,
          userId,
        },
        tx,
      )
      return after
    })
  }

  /** RN-CAN-10: chamado no cancelamento da venda. Devolve o alerta a mostrar, se houver nota. */
  async onSaleCancelled(saleId: string, tx: DbOrTx) {
    const changed = await this.repo.markCancelPending(saleId, tx)
    return changed > 0 ? 'Esta venda tem nota fiscal registrada: cancele a nota no emissor e registre aqui.' : null
  }

  /** Alerta da prévia do cancelamento. */
  async cancelAlert(saleId: string) {
    const docs = await this.repo.bySale(saleId)
    return docs.some((d) => d.status === 'registered')
      ? 'Esta venda tem nota fiscal registrada: depois de cancelar, cancele a nota no emissor e registre aqui.'
      : null
  }

  bySale(saleId: string, tx?: DbOrTx) {
    return this.repo.bySale(saleId, tx)
  }
}

/** Chave de acesso: 44 dígitos (aceita com espaços ou pontos). */
function normalizeAccessKey(value: string | null | undefined) {
  if (!value?.trim()) return null
  const digits = onlyDigits(value)
  if (digits.length !== 44)
    throw new ValidationError('A chave de acesso precisa ter 44 dígitos.', { field: 'accessKey' })
  return digits
}

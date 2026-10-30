import { isValidCnpj, isValidUf, onlyDigits } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import type { StoreSettings } from '../../db/schema'
import { businessDate, isValidTimeZone } from '../../shared/business-date'
import { ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { SettingsRepository, StoreSettingsUpdate } from './settings.repository'
import type { UpdateStoreSettingsInput } from './settings.schemas'

export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly audit: AuditService,
  ) {}

  get(tx?: DbOrTx): Promise<StoreSettings> {
    return this.repo.get(tx)
  }

  /** Dia da loja agora (ou no instante informado), no fuso configurado. */
  async businessDate(instant = new Date(), tx?: DbOrTx): Promise<string> {
    const { timezone } = await this.repo.get(tx)
    return businessDate(instant, timezone)
  }

  async update(input: UpdateStoreSettingsInput, userId: string): Promise<StoreSettings> {
    const changes = this.normalize(input)
    return db.transaction(async (tx) => {
      const before = await this.repo.get(tx)
      const after = await this.repo.update(changes, tx)
      await this.audit.record({ entity: 'store_settings', entityId: '1', action: 'update', before, after, userId }, tx)
      return after
    })
  }

  private normalize(input: UpdateStoreSettingsInput): StoreSettingsUpdate {
    const changes: StoreSettingsUpdate = { ...input }
    const blankToNull = (value: string | null | undefined) => (value?.trim() ? value.trim() : null)

    for (const key of [
      'legalName',
      'stateRegistration',
      'city',
      'address',
      'phone',
      'email',
      'receiptFooter',
    ] as const) {
      if (key in input) changes[key] = blankToNull(input[key])
    }
    if (input.storeName !== undefined) changes.storeName = input.storeName.trim()

    if ('uf' in input) {
      const uf = blankToNull(input.uf)?.toUpperCase() ?? null
      if (uf && !isValidUf(uf)) throw new ValidationError('UF inválida.', { field: 'uf' })
      changes.uf = uf
    }
    if ('cnpj' in input) {
      const cnpj = blankToNull(input.cnpj)
      if (cnpj && !isValidCnpj(cnpj)) throw new ValidationError('CNPJ inválido.', { field: 'cnpj' })
      changes.cnpj = cnpj ? onlyDigits(cnpj) : null
    }
    if (input.timezone !== undefined && !isValidTimeZone(input.timezone)) {
      throw new ValidationError('Fuso horário inválido.', { field: 'timezone' })
    }
    return changes
  }
}

import { strToU8, zipSync } from 'fflate'
import { toCsv } from '../../shared/csv'
import type { AuditService } from '../audit/audit.service'
import type { SettingsService } from '../settings/settings.service'
import { EXPORT_TABLES, type ExportsRepository } from './exports.repository'

const cell = (value: unknown) =>
  value === null || value === undefined
    ? ''
    : value instanceof Date
      ? value.toISOString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)

/**
 * RN-ACE-04: cópia dos cadastros e registros da loja em CSV dentro de um ZIP. Valores como estão no banco
 * (dinheiro em centavos, datas ISO), para servirem de backup legível e para levar a outra planilha.
 */
export class ExportsService {
  constructor(
    private readonly repo: ExportsRepository,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async fullZip(userId: string) {
    const files: Record<string, Uint8Array> = {}
    for (const [fileName, table] of Object.entries(EXPORT_TABLES)) {
      const rows = await this.repo.dump(table)
      const columns = Object.keys(rows[0] ?? {}).map((key) => ({
        header: key,
        value: (row: Record<string, unknown>) => cell(row[key]),
      }))
      files[`${fileName}.csv`] = strToU8(rows.length ? toCsv(columns, rows) : '')
    }
    const today = await this.settings.businessDate()
    await this.audit.record({ entity: 'export', action: 'full_zip', userId })
    return { fileName: `estoque-dados-${today}.zip`, zip: zipSync(files) }
  }
}

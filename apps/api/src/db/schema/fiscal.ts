import { FISCAL_DOC_STATUSES, FISCAL_DOC_TYPES } from '@estoque/shared'
import { date, index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { createdAt, id, updatedAt } from './columns'
import { sales } from './sales'

export const fiscalDocType = pgEnum('fiscal_doc_type', FISCAL_DOC_TYPES)
export const fiscalDocStatus = pgEnum('fiscal_doc_status', FISCAL_DOC_STATUSES)

/** Nota emitida fora do sistema e registrada na venda (RN-FIS-06). O sistema não emite nem consulta a SEFAZ. */
export const fiscalDocuments = pgTable(
  'fiscal_documents',
  {
    id: id(),
    saleId: uuid()
      .notNull()
      .references(() => sales.id),
    docType: fiscalDocType().notNull(),
    number: text().notNull(),
    series: text(),
    /** 44 dígitos. */
    accessKey: text(),
    issuedAt: date({ mode: 'string' }).notNull(),
    status: fiscalDocStatus().notNull().default('registered'),
    cancelledAt: date({ mode: 'string' }),
    notes: text(),
    createdBy: uuid().references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.saleId), index().on(table.status)],
)

export type FiscalDocument = typeof fiscalDocuments.$inferSelect

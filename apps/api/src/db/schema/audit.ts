import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { createdAt, id } from './columns'

/** Ações sensíveis (preço, inativação, ajuste, cancelamento, estorno, fiscal, login…). Só INSERT. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    entity: text().notNull(),
    entityId: text(),
    action: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    reason: text(),
    userId: uuid().references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.entity, table.entityId)],
)

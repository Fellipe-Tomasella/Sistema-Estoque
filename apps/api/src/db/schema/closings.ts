import { date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'

/** Fechamento salvo do dia (RN-FEC-06): retrato dos totais, para mostrar o que mudou depois. */
export const dailyClosings = pgTable('daily_closings', {
  businessDate: date({ mode: 'string' }).primaryKey(),
  expectedCashCents: integer().notNull(),
  countedCashCents: integer().notNull(),
  differenceCents: integer().notNull(),
  snapshot: jsonb().notNull(),
  notes: text(),
  closedAt: timestamp({ withTimezone: true }).notNull(),
  closedBy: uuid().references(() => users.id),
})

export type DailyClosing = typeof dailyClosings.$inferSelect

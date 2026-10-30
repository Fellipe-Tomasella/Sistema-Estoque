import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createdAt, id, updatedAt } from './columns'

export const users = pgTable('users', {
  id: id(),
  name: text().notNull(),
  email: text().notNull().unique(), // sempre gravado em minúsculas
  passwordHash: text().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull().unique(),
    userAgent: text(),
    ip: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.userId)],
)

export const passwordResets = pgTable('password_resets', {
  id: id(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  usedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
})

export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect

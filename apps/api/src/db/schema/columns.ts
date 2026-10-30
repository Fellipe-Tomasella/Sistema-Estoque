import { timestamp, uuid } from 'drizzle-orm/pg-core'

/** PK uuid v7 (ordenável), gerada na aplicação. */
export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7())

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()
export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date())

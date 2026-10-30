import { and, asc, count, eq, or, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { type Customer, customers } from '../../db/schema'
import { containsPattern, searchable } from '../../shared/sql'
import type { ListCustomersFilters } from './customers.schemas'

export type CustomerValues = Omit<typeof customers.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>

export class CustomersRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: CustomerValues) {
    const [customer] = await this.db.insert(customers).values(values).returning()
    return customer!
  }

  async update(id: string, changes: Partial<CustomerValues>) {
    const [customer] = await this.db.update(customers).set(changes).where(eq(customers.id, id)).returning()
    return customer
  }

  async find(id: string, tx: DbOrTx = this.db): Promise<Customer | undefined> {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, id))
    return customer
  }

  async findByDocument(document: string) {
    const [customer] = await this.db.select().from(customers).where(eq(customers.document, document))
    return customer
  }

  /** Busca por nome (sem acento), telefone ou documento (só dígitos). */
  async list(filters: ListCustomersFilters) {
    const status = filters.status ?? 'active'
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 50
    const q = filters.q?.trim()
    const digits = q?.replace(/\D/g, '') ?? ''

    const where = and(
      status === 'all' ? undefined : eq(customers.active, status === 'active'),
      q
        ? or(
            sql`${searchable(customers.name)} like ${searchable(containsPattern(q))}`,
            digits.length >= 3
              ? sql`regexp_replace(coalesce(${customers.phone}, ''), '\D', '', 'g') like ${containsPattern(digits)}`
              : undefined,
            digits.length >= 3 ? sql`${customers.document} like ${containsPattern(digits)}` : undefined,
          )
        : undefined,
    )
    const [{ total } = { total: 0 }] = await this.db.select({ total: count() }).from(customers).where(where)
    const items = await this.db
      .select()
      .from(customers)
      .where(where)
      .orderBy(asc(sql`lower(${customers.name})`), asc(customers.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return { items, total, page, pageSize }
  }
}

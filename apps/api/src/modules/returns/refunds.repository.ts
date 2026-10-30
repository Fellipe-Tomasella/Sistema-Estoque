import { asc, desc, eq } from 'drizzle-orm'
import type { RefundStatus } from '@estoque/shared'
import type { DbOrTx } from '../../db/client'
import { type Refund, refunds, sales } from '../../db/schema'

export class RefundsRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: typeof refunds.$inferInsert, tx: DbOrTx) {
    const [refund] = await tx.insert(refunds).values(values).returning()
    return refund!
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false): Promise<Refund | undefined> {
    const query = tx.select().from(refunds).where(eq(refunds.id, id))
    const [refund] = lock ? await query.for('update') : await query
    return refund
  }

  async update(id: string, changes: Partial<typeof refunds.$inferInsert>, tx: DbOrTx) {
    const [refund] = await tx.update(refunds).set(changes).where(eq(refunds.id, id)).returning()
    return refund!
  }

  bySale(saleId: string, tx: DbOrTx = this.db) {
    return tx.select().from(refunds).where(eq(refunds.saleId, saleId)).orderBy(asc(refunds.createdAt))
  }

  list(status?: RefundStatus) {
    return this.db
      .select({ refund: refunds, saleNumber: sales.number, customer: sales.customerSnapshot })
      .from(refunds)
      .innerJoin(sales, eq(sales.id, refunds.saleId))
      .where(status ? eq(refunds.status, status) : undefined)
      .orderBy(desc(refunds.createdAt))
  }
}

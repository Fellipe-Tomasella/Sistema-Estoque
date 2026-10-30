import { and, asc, eq } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { type Payment, payments } from '../../db/schema'

export class PaymentsRepository {
  constructor(private readonly db: DbOrTx) {}

  async insertMany(rows: (typeof payments.$inferInsert)[], tx: DbOrTx) {
    if (rows.length === 0) return []
    return tx.insert(payments).values(rows).returning()
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false): Promise<Payment | undefined> {
    const query = tx.select().from(payments).where(eq(payments.id, id))
    const [payment] = lock ? await query.for('update') : await query
    return payment
  }

  bySale(saleId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(payments)
      .where(and(eq(payments.saleId, saleId)))
      .orderBy(asc(payments.receivedAt), asc(payments.id))
  }

  async update(id: string, changes: Partial<typeof payments.$inferInsert>, tx: DbOrTx) {
    const [payment] = await tx.update(payments).set(changes).where(eq(payments.id, id)).returning()
    return payment!
  }
}

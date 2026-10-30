import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { payments, type Receivable, receivableAdjustments, receivableAllocations, receivables } from '../../db/schema'

export class ReceivablesRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: typeof receivables.$inferInsert, tx: DbOrTx) {
    const [receivable] = await tx.insert(receivables).values(values).returning()
    return receivable!
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false): Promise<Receivable | undefined> {
    const query = tx.select().from(receivables).where(eq(receivables.id, id))
    const [receivable] = lock ? await query.for('update') : await query
    return receivable
  }

  async bySale(saleId: string, tx: DbOrTx = this.db): Promise<Receivable | undefined> {
    const [receivable] = await tx.select().from(receivables).where(eq(receivables.saleId, saleId))
    return receivable
  }

  /** Dívidas da cliente: em aberto primeiro, depois as demais; das mais antigas para as mais novas. */
  byCustomer(customerId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(receivables)
      .where(eq(receivables.customerId, customerId))
      .orderBy(
        sql`${receivables.status} <> 'open'`,
        asc(receivables.businessDate),
        asc(receivables.createdAt),
        asc(receivables.id),
      )
  }

  /** Dívidas em aberto travadas, das mais antigas para as mais novas (ordem da sugestão de abatimento). */
  openByCustomerLocked(customerId: string, tx: DbOrTx) {
    return tx
      .select()
      .from(receivables)
      .where(and(eq(receivables.customerId, customerId), eq(receivables.status, 'open')))
      .orderBy(asc(receivables.businessDate), asc(receivables.createdAt), asc(receivables.id))
      .for('update')
  }

  async update(id: string, changes: Partial<typeof receivables.$inferInsert>, tx: DbOrTx = this.db) {
    const [receivable] = await tx.update(receivables).set(changes).where(eq(receivables.id, id)).returning()
    return receivable!
  }

  async insertAllocations(rows: (typeof receivableAllocations.$inferInsert)[], tx: DbOrTx) {
    if (rows.length > 0) await tx.insert(receivableAllocations).values(rows)
  }

  allocationsByPayment(paymentId: string, tx: DbOrTx = this.db) {
    return tx.select().from(receivableAllocations).where(eq(receivableAllocations.paymentId, paymentId))
  }

  /** Abatimentos das dívidas, com os dados do pagamento (forma, data, situação). */
  allocationsFor(receivableIds: string[], tx: DbOrTx = this.db) {
    if (receivableIds.length === 0) return Promise.resolve([])
    return tx
      .select({
        receivableId: receivableAllocations.receivableId,
        paymentId: payments.id,
        amountCents: receivableAllocations.amountCents,
        method: payments.method,
        kind: payments.kind,
        businessDate: payments.businessDate,
        receivedAt: payments.receivedAt,
        status: payments.status,
        voidReason: payments.voidReason,
      })
      .from(receivableAllocations)
      .innerJoin(payments, eq(payments.id, receivableAllocations.paymentId))
      .where(inArray(receivableAllocations.receivableId, receivableIds))
      .orderBy(asc(payments.receivedAt))
  }

  async insertAdjustment(values: typeof receivableAdjustments.$inferInsert, tx: DbOrTx) {
    await tx.insert(receivableAdjustments).values(values)
  }

  adjustmentsFor(receivableIds: string[], tx: DbOrTx = this.db) {
    if (receivableIds.length === 0) return Promise.resolve([])
    return tx
      .select()
      .from(receivableAdjustments)
      .where(inArray(receivableAdjustments.receivableId, receivableIds))
      .orderBy(asc(receivableAdjustments.createdAt))
  }
}

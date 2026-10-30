import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { type Receivable, receivables } from '../../db/schema'

export class ReceivablesRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: typeof receivables.$inferInsert, tx: DbOrTx) {
    const [receivable] = await tx.insert(receivables).values(values).returning()
    return receivable!
  }

  async bySale(saleId: string, tx: DbOrTx = this.db): Promise<Receivable | undefined> {
    const [receivable] = await tx.select().from(receivables).where(eq(receivables.saleId, saleId))
    return receivable
  }
}

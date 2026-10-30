import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { type FiscalDocument, fiscalDocuments, sales } from '../../db/schema'

/** Nota “ativa” na venda: registrada ou aguardando cancelamento no emissor. */
const activeDoc = sql`exists (select 1 from fiscal_documents fd
  where fd.sale_id = "sales"."id" and fd.status in ('registered', 'cancel_pending'))`

export class FiscalRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: typeof fiscalDocuments.$inferInsert, tx: DbOrTx = this.db) {
    const [doc] = await tx.insert(fiscalDocuments).values(values).returning()
    return doc!
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false): Promise<FiscalDocument | undefined> {
    const query = tx.select().from(fiscalDocuments).where(eq(fiscalDocuments.id, id))
    const [doc] = lock ? await query.for('update') : await query
    return doc
  }

  async update(id: string, changes: Partial<typeof fiscalDocuments.$inferInsert>, tx: DbOrTx) {
    const [doc] = await tx.update(fiscalDocuments).set(changes).where(eq(fiscalDocuments.id, id)).returning()
    return doc!
  }

  bySale(saleId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.saleId, saleId))
      .orderBy(asc(fiscalDocuments.createdAt))
  }

  /** RN-CAN-10: notas registradas da venda passam a “cancelamento pendente”. Devolve quantas mudaram. */
  async markCancelPending(saleId: string, tx: DbOrTx) {
    const changed = await tx
      .update(fiscalDocuments)
      .set({ status: 'cancel_pending' })
      .where(and(eq(fiscalDocuments.saleId, saleId), eq(fiscalDocuments.status, 'registered')))
      .returning({ id: fiscalDocuments.id })
    return changed.length
  }

  /** Vendas que pedem nota (obrigatória ou revisar) e ainda não têm nota ativa. */
  salesWithoutDocument() {
    return this.db
      .select({
        saleId: sales.id,
        number: sales.number,
        businessDate: sales.businessDate,
        customer: sales.customerSnapshot,
        totalCents: sales.totalCents,
        requirement: sales.fiscalRequirement,
        note: sales.fiscalNote,
      })
      .from(sales)
      .where(
        and(
          eq(sales.status, 'confirmed'),
          inArray(sales.fiscalRequirement, ['required', 'review']),
          sql`not ${activeDoc}`,
        ),
      )
      .orderBy(asc(sales.businessDate), asc(sales.number))
  }

  /** Notas com cancelamento pendente no emissor. */
  cancelPending() {
    return this.db
      .select({ doc: fiscalDocuments, saleNumber: sales.number })
      .from(fiscalDocuments)
      .innerJoin(sales, eq(sales.id, fiscalDocuments.saleId))
      .where(eq(fiscalDocuments.status, 'cancel_pending'))
      .orderBy(desc(fiscalDocuments.updatedAt))
  }
}

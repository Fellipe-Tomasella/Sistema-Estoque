import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { type Return, returnItems, returns, saleItems, sales } from '../../db/schema'

export type ReturnWithItems = Awaited<ReturnType<ReturnsRepository['bySale']>>[number]

export class ReturnsRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: typeof returns.$inferInsert, tx: DbOrTx) {
    const [created] = await tx.insert(returns).values(values).returning()
    return created!
  }

  insertItems(rows: (typeof returnItems.$inferInsert)[], tx: DbOrTx) {
    return tx.insert(returnItems).values(rows).returning()
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false): Promise<Return | undefined> {
    const query = tx.select().from(returns).where(eq(returns.id, id))
    const [found] = lock ? await query.for('update') : await query
    return found
  }

  async update(id: string, changes: Partial<typeof returns.$inferInsert>, tx: DbOrTx) {
    await tx.update(returns).set(changes).where(eq(returns.id, id))
  }

  async findItem(id: string, tx: DbOrTx, lock = false) {
    const query = tx.select().from(returnItems).where(eq(returnItems.id, id))
    const [item] = lock ? await query.for('update') : await query
    return item
  }

  async updateItem(id: string, changes: Partial<typeof returnItems.$inferInsert>, tx: DbOrTx) {
    await tx.update(returnItems).set(changes).where(eq(returnItems.id, id))
  }

  async countAwaiting(returnId: string, tx: DbOrTx) {
    const rows = await tx
      .select({ id: returnItems.id })
      .from(returnItems)
      .where(and(eq(returnItems.returnId, returnId), eq(returnItems.status, 'awaiting')))
    return rows.length
  }

  /** `returned_qty` conta peças devolvidas e aguardando retorno (RN-DEV-01). */
  async addReturnedQty(saleItemId: string, quantity: number, tx: DbOrTx) {
    await tx
      .update(saleItems)
      .set({ returnedQty: sql`${saleItems.returnedQty} + ${quantity}` })
      .where(eq(saleItems.id, saleItemId))
  }

  /** Devoluções da venda com os itens (nome e rótulo vêm do item da venda). */
  async bySale(saleId: string, tx: DbOrTx = this.db) {
    const list = await tx.select().from(returns).where(eq(returns.saleId, saleId)).orderBy(asc(returns.createdAt))
    return this.withItems(list, tx)
  }

  /** Pendências de retorno físico (RN-CAN-04): peças que ainda estão com a cliente. */
  async awaiting() {
    const list = await this.db
      .select({ ret: returns, saleNumber: sales.number, customer: sales.customerSnapshot })
      .from(returns)
      .innerJoin(sales, eq(sales.id, returns.saleId))
      .where(eq(returns.status, 'awaiting_items'))
      .orderBy(desc(returns.createdAt))
    const withItems = await this.withItems(
      list.map((r) => r.ret),
      this.db,
    )
    return withItems.map((ret, i) => ({ ...ret, saleNumber: list[i]!.saleNumber, customer: list[i]!.customer }))
  }

  private async withItems(list: Return[], tx: DbOrTx) {
    if (list.length === 0) return []
    const items = await tx
      .select({
        id: returnItems.id,
        returnId: returnItems.returnId,
        saleItemId: returnItems.saleItemId,
        variantId: returnItems.variantId,
        productName: saleItems.productName,
        variantLabel: saleItems.variantLabel,
        quantity: returnItems.quantity,
        status: returnItems.status,
        condition: returnItems.condition,
        receivedAt: returnItems.receivedAt,
      })
      .from(returnItems)
      .innerJoin(saleItems, eq(saleItems.id, returnItems.saleItemId))
      .where(
        inArray(
          returnItems.returnId,
          list.map((r) => r.id),
        ),
      )
      .orderBy(asc(returnItems.id))
    const byReturn = Map.groupBy(items, (item) => item.returnId)
    return list.map((ret) => ({ ...ret, items: byReturn.get(ret.id) ?? [] }))
  }
}

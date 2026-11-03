import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { type WebOrder, type WebOrderItem, webOrderItems, webOrders } from '../../db/schema'

export type WebOrderChanges = Partial<Pick<WebOrder, 'status' | 'saleId' | 'declineReason' | 'contactedAt'>>

export class WebOrdersRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(
    order: typeof webOrders.$inferInsert,
    items: Omit<typeof webOrderItems.$inferInsert, 'orderId'>[],
    tx: DbOrTx,
  ) {
    const [created] = await tx.insert(webOrders).values(order).returning()
    await tx.insert(webOrderItems).values(items.map((item) => ({ ...item, orderId: created!.id })))
    return created!
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false): Promise<WebOrder | undefined> {
    const query = tx.select().from(webOrders).where(eq(webOrders.id, id))
    const [order] = lock ? await query.for('update') : await query
    return order
  }

  items(orderIds: string[], tx: DbOrTx = this.db): Promise<WebOrderItem[]> {
    if (orderIds.length === 0) return Promise.resolve([])
    return tx.select().from(webOrderItems).where(inArray(webOrderItems.orderId, orderIds)).orderBy(webOrderItems.id)
  }

  list(statuses: WebOrder['status'][]) {
    return this.db
      .select()
      .from(webOrders)
      .where(inArray(webOrders.status, statuses))
      .orderBy(desc(webOrders.createdAt))
      .limit(200)
  }

  async countNew() {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(webOrders)
      .where(eq(webOrders.status, 'new'))
    return row?.total ?? 0
  }

  async update(id: string, changes: WebOrderChanges, tx: DbOrTx = this.db) {
    const [order] = await tx.update(webOrders).set(changes).where(eq(webOrders.id, id)).returning()
    return order!
  }

  /** Marca como convertido só se ainda não foi (dois cliques ou dois aparelhos: um só vira venda). */
  async markConverted(id: string, saleId: string, tx: DbOrTx = this.db) {
    const rows = await tx
      .update(webOrders)
      .set({ status: 'converted', saleId })
      .where(and(eq(webOrders.id, id), isNull(webOrders.saleId), inArray(webOrders.status, ['new', 'contacted'])))
      .returning({ id: webOrders.id })
    return rows.length > 0
  }

  async hasItemsFor(variantIds: string[], tx: DbOrTx = this.db) {
    if (variantIds.length === 0) return false
    const [row] = await tx
      .select({ one: sql`1` })
      .from(webOrderItems)
      .where(inArray(webOrderItems.variantId, variantIds))
      .limit(1)
    return Boolean(row)
  }
}

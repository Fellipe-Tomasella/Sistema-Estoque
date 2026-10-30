import { and, count, desc, eq, exists, gte, inArray, lte, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { payments, products, type Sale, saleItems, sales, variants } from '../../db/schema'
import type { ListSalesFilters } from './sales.schemas'

export type SaleChanges = Partial<Omit<typeof sales.$inferInsert, 'id' | 'createdAt'>>
export type NewSaleItem = Omit<typeof saleItems.$inferInsert, 'id' | 'saleId'>

export class SalesRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: typeof sales.$inferInsert, tx: DbOrTx = this.db) {
    const [sale] = await tx.insert(sales).values(values).returning()
    return sale!
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false): Promise<Sale | undefined> {
    const query = tx.select().from(sales).where(eq(sales.id, id))
    const [sale] = lock ? await query.for('update') : await query
    return sale
  }

  async update(id: string, changes: SaleChanges, tx: DbOrTx = this.db) {
    const [sale] = await tx.update(sales).set(changes).where(eq(sales.id, id)).returning()
    return sale!
  }

  async delete(id: string, tx: DbOrTx) {
    await tx.delete(sales).where(eq(sales.id, id))
  }

  items(saleId: string, tx: DbOrTx = this.db) {
    return tx.select().from(saleItems).where(eq(saleItems.saleId, saleId)).orderBy(saleItems.id)
  }

  /** O carrinho do rascunho é sempre regravado inteiro. */
  async replaceItems(saleId: string, items: NewSaleItem[], tx: DbOrTx) {
    await tx.delete(saleItems).where(eq(saleItems.saleId, saleId))
    if (items.length > 0) await tx.insert(saleItems).values(items.map((item) => ({ ...item, saleId })))
  }

  async updateItem(id: string, changes: Partial<NewSaleItem>, tx: DbOrTx) {
    await tx.update(saleItems).set(changes).where(eq(saleItems.id, id))
  }

  /**
   * Dados atuais do catálogo para as variações do carrinho. Com `lock`, trava as variações em ordem de id
   * (confirmação: a checagem de saldo e a baixa acontecem com elas travadas).
   */
  catalog(variantIds: string[], tx: DbOrTx = this.db, lock = false) {
    if (variantIds.length === 0) return Promise.resolve([])
    const query = tx
      .select({
        variantId: variants.id,
        productName: products.name,
        color: variants.color,
        size: variants.size,
        unitPriceCents: sql<number>`coalesce(${variants.priceCents}, ${products.basePriceCents})`,
        stockQty: variants.stockQty,
        sellable: sql<boolean>`${variants.active} and ${products.active}`,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(inArray(variants.id, variantIds))
      .orderBy(variants.id)
    return lock ? query.for('update', { of: variants }) : query
  }

  async nextNumber(tx: DbOrTx): Promise<number> {
    const [row] = await tx.execute<{ value: string }>(sql`select nextval('sale_number_seq') as value`)
    return Number(row!.value)
  }

  drafts() {
    return this.db.select().from(sales).where(eq(sales.status, 'draft')).orderBy(desc(sales.updatedAt))
  }

  /** Histórico (RN-VEN-13). Sem filtro de situação, traz as confirmadas e as canceladas. */
  async list(filters: ListSalesFilters) {
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 50
    const where = and(
      filters.status ? eq(sales.status, filters.status) : inArray(sales.status, ['confirmed', 'cancelled']),
      filters.from ? gte(sales.businessDate, filters.from) : undefined,
      filters.to ? lte(sales.businessDate, filters.to) : undefined,
      filters.customerId ? eq(sales.customerId, filters.customerId) : undefined,
      filters.paymentStatus ? eq(sales.paymentStatus, filters.paymentStatus) : undefined,
      filters.shippingStatus ? eq(sales.shippingStatus, filters.shippingStatus) : undefined,
      filters.number ? eq(sales.number, filters.number) : undefined,
      filters.method
        ? exists(
            this.db
              .select({ one: sql`1` })
              .from(payments)
              .where(
                and(eq(payments.saleId, sales.id), eq(payments.method, filters.method), eq(payments.status, 'valid')),
              ),
          )
        : undefined,
    )
    const [{ total } = { total: 0 }] = await this.db.select({ total: count() }).from(sales).where(where)
    const items = await this.db
      .select()
      .from(sales)
      .where(where)
      .orderBy(desc(sales.confirmedAt), desc(sales.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return { items, total, page, pageSize }
  }
}

import { and, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { products, stockEntries, stockEntryItems, variants } from '../../db/schema'

export interface EntryFilters {
  from?: string
  to?: string
  page: number
  pageSize: number
}

export class StockEntriesRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(
    entry: typeof stockEntries.$inferInsert,
    items: Omit<typeof stockEntryItems.$inferInsert, 'entryId'>[],
    tx: DbOrTx,
  ) {
    await tx.insert(stockEntries).values(entry)
    await tx.insert(stockEntryItems).values(items.map((item) => ({ ...item, entryId: entry.id })))
  }

  async find(id: string, tx: DbOrTx = this.db) {
    const [entry] = await tx.select().from(stockEntries).where(eq(stockEntries.id, id))
    if (!entry) return undefined
    const items = await tx
      .select({
        id: stockEntryItems.id,
        variantId: stockEntryItems.variantId,
        productName: products.name,
        color: variants.color,
        size: variants.size,
        quantity: stockEntryItems.quantity,
        unitCostCents: stockEntryItems.unitCostCents,
      })
      .from(stockEntryItems)
      .innerJoin(variants, eq(variants.id, stockEntryItems.variantId))
      .innerJoin(products, eq(products.id, variants.productId))
      .where(eq(stockEntryItems.entryId, id))
      .orderBy(stockEntryItems.id)
    return { ...entry, items }
  }

  async list(filters: EntryFilters) {
    const where = and(
      filters.from ? gte(stockEntries.entryDate, filters.from) : undefined,
      filters.to ? lte(stockEntries.entryDate, filters.to) : undefined,
    )
    const [{ total } = { total: 0 }] = await this.db.select({ total: count() }).from(stockEntries).where(where)
    const items = await this.db
      .select({
        id: stockEntries.id,
        entryDate: stockEntries.entryDate,
        supplierName: stockEntries.supplierName,
        reference: stockEntries.reference,
        itemCount: count(stockEntryItems.id),
        units: sql<number>`${sum(stockEntryItems.quantity)}::int`,
        createdAt: stockEntries.createdAt,
      })
      .from(stockEntries)
      .innerJoin(stockEntryItems, eq(stockEntryItems.entryId, stockEntries.id))
      .where(where)
      .groupBy(stockEntries.id)
      .orderBy(desc(stockEntries.entryDate), desc(stockEntries.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)
    return { items, total, page: filters.page, pageSize: filters.pageSize }
  }
}

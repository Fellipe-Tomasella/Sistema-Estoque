import { eq, inArray, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { products, stockMovements, variants } from '../../db/schema'

export class StockRepository {
  constructor(private readonly db: DbOrTx) {}

  /** Trava as variações (FOR UPDATE) em ordem de id, para evitar deadlock entre operações simultâneas. */
  lockVariants(ids: string[], tx: DbOrTx) {
    return tx
      .select({
        id: variants.id,
        stockQty: variants.stockQty,
        active: variants.active,
        color: variants.color,
        size: variants.size,
        productName: products.name,
        productActive: products.active,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(inArray(variants.id, ids))
      .orderBy(variants.id)
      .for('update', { of: variants })
  }

  async setStockQty(variantId: string, stockQty: number, tx: DbOrTx) {
    await tx.update(variants).set({ stockQty }).where(eq(variants.id, variantId))
  }

  insertMovements(rows: (typeof stockMovements.$inferInsert)[], tx: DbOrTx) {
    return tx.insert(stockMovements).values(rows).returning()
  }

  async hasMovements(variantIds: string[], tx: DbOrTx = this.db): Promise<boolean> {
    if (variantIds.length === 0) return false
    const [row] = await tx
      .select({ exists: sql<boolean>`true` })
      .from(stockMovements)
      .where(inArray(stockMovements.variantId, variantIds))
      .limit(1)
    return Boolean(row)
  }
}

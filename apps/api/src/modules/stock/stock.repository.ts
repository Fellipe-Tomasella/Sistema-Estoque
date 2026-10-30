import type { StockMovementType } from '@estoque/shared'
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, or, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { products, stockMovements, users, variants } from '../../db/schema'

export interface MovementFilters {
  variantId?: string
  type?: StockMovementType
  from?: string
  to?: string
  page: number
  pageSize: number
}

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

  async findMovement(id: string, tx: DbOrTx = this.db) {
    const [movement] = await tx.select().from(stockMovements).where(eq(stockMovements.id, id))
    return movement
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

  /** Histórico (RN-EST-10): por variação ou geral, mais recente primeiro. */
  async listMovements(filters: MovementFilters) {
    const where = and(
      filters.variantId ? eq(stockMovements.variantId, filters.variantId) : undefined,
      filters.type ? eq(stockMovements.type, filters.type) : undefined,
      filters.from ? gte(stockMovements.businessDate, filters.from) : undefined,
      filters.to ? lte(stockMovements.businessDate, filters.to) : undefined,
    )
    const [{ total } = { total: 0 }] = await this.db.select({ total: count() }).from(stockMovements).where(where)
    const items = await this.db
      .select({
        id: stockMovements.id,
        variantId: stockMovements.variantId,
        productId: products.id,
        productName: products.name,
        color: variants.color,
        size: variants.size,
        type: stockMovements.type,
        quantityDelta: stockMovements.quantityDelta,
        balanceAfter: stockMovements.balanceAfter,
        adjustmentReason: stockMovements.adjustmentReason,
        countedQty: stockMovements.countedQty,
        note: stockMovements.note,
        refType: stockMovements.refType,
        refId: stockMovements.refId,
        businessDate: stockMovements.businessDate,
        createdAt: stockMovements.createdAt,
        createdByName: users.name,
      })
      .from(stockMovements)
      .innerJoin(variants, eq(variants.id, stockMovements.variantId))
      .innerJoin(products, eq(products.id, variants.productId))
      .leftJoin(users, eq(users.id, stockMovements.createdBy))
      .where(where)
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)
    return { items, total, page: filters.page, pageSize: filters.pageSize }
  }

  /** Variações ativas de produtos ativos que estão sem estoque ou no mínimo. */
  alertVariants() {
    return this.db
      .select({
        variantId: variants.id,
        productId: products.id,
        productName: products.name,
        color: variants.color,
        size: variants.size,
        stockQty: variants.stockQty,
        minStock: variants.minStock,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(
        and(
          eq(products.active, true),
          eq(variants.active, true),
          or(eq(variants.stockQty, 0), and(isNotNull(variants.minStock), lte(variants.stockQty, variants.minStock))),
        ),
      )
      .orderBy(asc(sql`lower(${products.name})`), asc(variants.color), asc(variants.sizeSort))
  }
}

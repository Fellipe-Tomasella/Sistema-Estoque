import { asc, eq } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { importBatches, products, variants } from '../../db/schema'
import type { ExistingCatalog } from './import-rows'

export class ImportsRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(values: typeof importBatches.$inferInsert) {
    const [batch] = await this.db.insert(importBatches).values(values).returning()
    return batch!
  }

  async find(id: string, tx: DbOrTx = this.db, lock = false) {
    const query = tx.select().from(importBatches).where(eq(importBatches.id, id))
    const [batch] = lock ? await query.for('update') : await query
    return batch
  }

  async update(id: string, changes: Partial<typeof importBatches.$inferInsert>, tx: DbOrTx = this.db) {
    const [batch] = await tx.update(importBatches).set(changes).where(eq(importBatches.id, id)).returning()
    return batch!
  }

  /** Catálogo atual para casar nomes e detectar variações já cadastradas (volume pequeno: cabe em memória). */
  async catalog(tx: DbOrTx = this.db): Promise<ExistingCatalog> {
    const [productRows, variantRows] = await Promise.all([
      tx
        .select({ id: products.id, name: products.name, basePriceCents: products.basePriceCents })
        .from(products)
        .orderBy(asc(products.createdAt)),
      tx.select({ productId: variants.productId, color: variants.color, size: variants.size }).from(variants),
    ])
    return { products: productRows, variants: variantRows }
  }
}

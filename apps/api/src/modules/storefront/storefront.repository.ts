import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { productImages, products, type StorefrontSettings, storefrontSettings, variants } from '../../db/schema'

export type StorefrontSettingsUpdate = Partial<Omit<StorefrontSettings, 'id' | 'updatedAt'>>

/** Leitura do catálogo público (RN-LOJ-01): só produtos ativos marcados para o site, variações ativas e fotos do site. */
export class StorefrontRepository {
  constructor(private readonly db: DbOrTx) {}

  async getSettings(tx: DbOrTx = this.db): Promise<StorefrontSettings> {
    await tx.insert(storefrontSettings).values({ id: 1 }).onConflictDoNothing()
    const [row] = await tx.select().from(storefrontSettings).where(eq(storefrontSettings.id, 1))
    return row!
  }

  async updateSettings(changes: StorefrontSettingsUpdate, tx: DbOrTx = this.db): Promise<StorefrontSettings> {
    const [row] = await tx.update(storefrontSettings).set(changes).where(eq(storefrontSettings.id, 1)).returning()
    return row!
  }

  /** Produtos do site (todos, ou um só por id), com variações e fotos. */
  async catalog(productId?: string) {
    const items = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.showOnSite, true),
          eq(products.active, true),
          productId ? eq(products.id, productId) : undefined,
        ),
      )
      .orderBy(asc(sql`lower(${products.name})`), asc(products.id))
    if (items.length === 0) return []

    const ids = items.map((p) => p.id)
    const [variantRows, imageRows] = await Promise.all([
      this.db
        .select()
        .from(variants)
        .where(and(inArray(variants.productId, ids), eq(variants.active, true)))
        .orderBy(asc(sql`lower(${variants.color})`), asc(variants.sizeSort), asc(variants.size)),
      this.db
        .select()
        .from(productImages)
        .where(and(inArray(productImages.productId, ids), eq(productImages.showOnSite, true)))
        .orderBy(asc(productImages.position)),
    ])
    const variantsBy = Map.groupBy(variantRows, (v) => v.productId)
    const imagesBy = Map.groupBy(imageRows, (i) => i.productId)
    return items.map((product) => ({
      product,
      variants: variantsBy.get(product.id) ?? [],
      images: imagesBy.get(product.id) ?? [],
    }))
  }
}

export type CatalogEntry = Awaited<ReturnType<StorefrontRepository['catalog']>>[number]

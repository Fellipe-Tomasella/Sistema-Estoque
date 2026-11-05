import { and, asc, count, eq, exists, inArray, isNotNull, lte, or, type SQL, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import {
  type Product,
  type ProductImage,
  productImages,
  products,
  saleItems,
  supplierItemLinks,
  type Variant,
  variants,
} from '../../db/schema'
import { containsPattern, equalsIgnoreCase, searchable } from '../../shared/sql'
import type { ListProductsFilters } from './products.schemas'

export type ProductChanges = Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
export type ImageChanges = Partial<Pick<ProductImage, 'color' | 'showOnSite' | 'position'>>
export type VariantChanges = Partial<Omit<Variant, 'id' | 'productId' | 'stockQty' | 'createdAt' | 'updatedAt'>>

const variantOrder = [asc(sql`lower(${variants.color})`), asc(variants.sizeSort), asc(variants.size)]

export class ProductsRepository {
  constructor(private readonly db: DbOrTx) {}

  async insertProduct(values: typeof products.$inferInsert, tx: DbOrTx) {
    const [product] = await tx.insert(products).values(values).returning()
    return product!
  }

  insertVariants(values: (typeof variants.$inferInsert)[], tx: DbOrTx) {
    return tx.insert(variants).values(values).returning()
  }

  async findProduct(id: string, tx: DbOrTx = this.db, lock = false) {
    const query = tx.select().from(products).where(eq(products.id, id))
    const [product] = lock ? await query.for('update') : await query
    return product
  }

  findVariants(productId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(variants)
      .where(eq(variants.productId, productId))
      .orderBy(...variantOrder)
  }

  async findVariant(id: string, tx: DbOrTx = this.db) {
    const [variant] = await tx.select().from(variants).where(eq(variants.id, id))
    return variant
  }

  async updateProduct(id: string, changes: ProductChanges, tx: DbOrTx) {
    const [product] = await tx.update(products).set(changes).where(eq(products.id, id)).returning()
    return product!
  }

  async updateVariant(id: string, changes: VariantChanges, tx: DbOrTx) {
    const [variant] = await tx.update(variants).set(changes).where(eq(variants.id, id)).returning()
    return variant!
  }

  async setMinStock(productId: string, minStock: number | null, tx: DbOrTx) {
    await tx.update(variants).set({ minStock }).where(eq(variants.productId, productId))
  }

  /** Variações com seus códigos (tela Códigos e etiquetas), com os códigos dos fornecedores já vinculados. */
  codes(filters: { q?: string; missing?: boolean; incomplete?: boolean; ids?: string[] }) {
    const words = (filters.q ?? '').trim().split(/\s+/).filter(Boolean)
    const haystack = searchable(
      sql`${products.name} || ' ' || ${variants.color} || ' ' || ${variants.size} || ' ' || coalesce(${products.reference}, '') || ' ' || coalesce(${variants.sku}, '') || ' ' || coalesce(${variants.barcode}, '')`,
    )
    return this.db
      .select({
        variantId: variants.id,
        productId: products.id,
        productName: products.name,
        reference: products.reference,
        color: variants.color,
        size: variants.size,
        sku: variants.sku,
        barcode: variants.barcode,
        priceCents: sql<number>`coalesce(${variants.priceCents}, ${products.basePriceCents})`.mapWith(Number),
        stockQty: variants.stockQty,
        supplierCodes: sql<
          string[]
        >`coalesce((select array_agg(${supplierItemLinks.supplierCode} order by ${supplierItemLinks.supplierCode})
          from ${supplierItemLinks} where ${supplierItemLinks.variantId} = ${variants.id}), '{}')`,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(
        and(
          eq(products.active, true),
          eq(variants.active, true),
          filters.missing ? sql`${variants.barcode} is null` : undefined,
          filters.incomplete ? sql`(${variants.barcode} is null or ${variants.sku} is null)` : undefined,
          filters.ids?.length ? inArray(variants.id, filters.ids) : undefined,
          ...words.map((word) => sql`${haystack} like ${searchable(containsPattern(word))}`),
        ),
      )
      .orderBy(asc(sql`lower(${products.name})`), ...variantOrder)
      .limit(filters.ids?.length ? 1000 : 500)
  }

  /** Peça pelo código lido no leitor ou na câmera: código de barras exato, SKU ou código do fornecedor. */
  async findByCode(code: string) {
    const [row] = await this.db
      .select({ variant: variants, product: products })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(
        and(
          eq(variants.active, true),
          eq(products.active, true),
          or(
            eq(variants.barcode, code),
            sql`lower(${variants.sku}) = lower(${code})`,
            exists(
              this.db
                .select({ one: sql`1` })
                .from(supplierItemLinks)
                .where(and(eq(supplierItemLinks.variantId, variants.id), eq(supplierItemLinks.supplierCode, code))),
            ),
          ),
        ),
      )
      // código de barras ganha de SKU e de código de fornecedor
      .orderBy(sql`(${variants.barcode} = ${code}) desc nulls last`)
      .limit(1)
    return row
  }

  async nextBarcodeNumber(tx: DbOrTx = this.db) {
    const [row] = await tx.execute<{ n: number }>(sql`select nextval('barcode_seq')::int as n`)
    return row!.n
  }

  /** Próximo número do código padrão do produto (RN-PRO-15). */
  async nextProductCode(tx: DbOrTx = this.db) {
    const [row] = await tx.execute<{ n: number }>(sql`select nextval('product_code_seq')::int as n`)
    return row!.n
  }

  async deleteProduct(id: string, tx: DbOrTx) {
    await tx
      .delete(supplierItemLinks)
      .where(
        inArray(
          supplierItemLinks.variantId,
          tx.select({ id: variants.id }).from(variants).where(eq(variants.productId, id)),
        ),
      )
    await tx.delete(productImages).where(eq(productImages.productId, id))
    await tx.delete(variants).where(eq(variants.productId, id))
    await tx.delete(products).where(eq(products.id, id))
  }

  async hasSaleItems(variantIds: string[], tx: DbOrTx = this.db): Promise<boolean> {
    if (variantIds.length === 0) return false
    const [row] = await tx
      .select({ one: sql`1` })
      .from(saleItems)
      .where(inArray(saleItems.variantId, variantIds))
      .limit(1)
    return Boolean(row)
  }

  /** Fotos de vários produtos, na ordem (a primeira de cada produto é a capa). */
  findImages(productIds: string[], tx: DbOrTx = this.db): Promise<ProductImage[]> {
    if (productIds.length === 0) return Promise.resolve([])
    return tx
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.productId), asc(productImages.position))
  }

  async insertImage(values: typeof productImages.$inferInsert, tx: DbOrTx) {
    const [image] = await tx.insert(productImages).values(values).returning()
    return image!
  }

  async updateImage(id: string, changes: ImageChanges, tx: DbOrTx) {
    await tx.update(productImages).set(changes).where(eq(productImages.id, id))
  }

  async deleteImage(id: string, tx: DbOrTx) {
    await tx.delete(productImages).where(eq(productImages.id, id))
  }

  async deleteVariant(id: string, tx: DbOrTx) {
    await tx.delete(supplierItemLinks).where(eq(supplierItemLinks.variantId, id))
    await tx.delete(variants).where(eq(variants.id, id))
  }

  /** Lista paginada; filtros de cor/tamanho/estoque trazem só os produtos — e as variações — que combinam. */
  async list(filters: ListProductsFilters) {
    const status = filters.status ?? 'active'
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 50

    const variantConditions: SQL[] = []
    if (status === 'active') variantConditions.push(eq(variants.active, true))
    if (filters.color) variantConditions.push(equalsIgnoreCase(variants.color, filters.color))
    if (filters.size) variantConditions.push(equalsIgnoreCase(variants.size, filters.size))
    if (filters.stock === 'out') variantConditions.push(eq(variants.stockQty, 0))
    if (filters.stock === 'low') {
      variantConditions.push(isNotNull(variants.minStock), lte(variants.stockQty, variants.minStock))
    }
    const filtersVariants = Boolean(filters.color || filters.size || filters.stock)

    const where = and(
      status === 'all' ? undefined : eq(products.active, status === 'active'),
      filters.q ? sql`${searchable(products.name)} like ${searchable(containsPattern(filters.q.trim()))}` : undefined,
      filters.category ? equalsIgnoreCase(products.category, filters.category) : undefined,
      filtersVariants
        ? exists(
            this.db
              .select({ one: sql`1` })
              .from(variants)
              .where(and(eq(variants.productId, products.id), ...variantConditions)),
          )
        : undefined,
    )

    const [{ total } = { total: 0 }] = await this.db.select({ total: count() }).from(products).where(where)
    const items = await this.db
      .select()
      .from(products)
      .where(where)
      .orderBy(asc(sql`lower(${products.name})`), asc(products.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const variantRows = items.length
      ? await this.db
          .select()
          .from(variants)
          .where(
            and(
              inArray(
                variants.productId,
                items.map((p) => p.id),
              ),
              ...variantConditions,
            ),
          )
          .orderBy(...variantOrder)
      : []

    return { items, variants: variantRows, total, page, pageSize }
  }

  /** Busca rápida do PDV e das entradas: todas as palavras precisam aparecer em “nome cor tamanho”. */
  searchVariants(q: string, limit: number) {
    const words = q.trim().split(/\s+/).filter(Boolean)
    const haystack = searchable(sql`${products.name} || ' ' || ${variants.color} || ' ' || ${variants.size}`)
    return this.db
      .select({ variant: variants, product: products })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(
        and(
          eq(products.active, true),
          eq(variants.active, true),
          or(
            and(...words.map((word) => sql`${haystack} like ${searchable(containsPattern(word))}`)),
            eq(variants.barcode, q.trim()),
            sql`lower(${variants.sku}) = lower(${q.trim()})`,
          ),
        ),
      )
      .orderBy(asc(sql`lower(${products.name})`), ...variantOrder)
      .limit(limit)
  }

  async suggestions() {
    const [colors, sizes, categories] = await Promise.all([
      this.db.selectDistinct({ value: variants.color }).from(variants).orderBy(variants.color),
      this.db
        .selectDistinct({ value: variants.size, sort: variants.sizeSort })
        .from(variants)
        .orderBy(variants.sizeSort, variants.size),
      this.db
        .selectDistinct({ value: products.category })
        .from(products)
        .where(isNotNull(products.category))
        .orderBy(products.category),
    ])
    return {
      colors: colors.map((r) => r.value),
      sizes: sizes.map((r) => r.value),
      categories: categories.map((r) => r.value!),
    }
  }
}

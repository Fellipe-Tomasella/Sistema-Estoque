import { and, count, desc, eq, gte, inArray, lte, sql, sum } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { products, stockEntries, stockEntryItems, supplierItemLinks, variants } from '../../db/schema'

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

  async findByAccessKey(accessKey: string) {
    const [entry] = await this.db.select().from(stockEntries).where(eq(stockEntries.nfeAccessKey, accessKey))
    return entry
  }

  /** Variações ativas candidatas a um item da nota: por vínculo do fornecedor, código de barras ou SKU. */
  async nfeCandidates(supplierDocument: string, codes: string[], barcodes: string[]) {
    const columns = {
      variantId: variants.id,
      productName: products.name,
      color: variants.color,
      size: variants.size,
      barcode: variants.barcode,
      sku: variants.sku,
    }
    const base = () => this.db.select(columns).from(variants).innerJoin(products, eq(products.id, variants.productId))
    const [links, byBarcode, bySku] = await Promise.all([
      codes.length && supplierDocument
        ? this.db
            .select({ ...columns, supplierCode: supplierItemLinks.supplierCode })
            .from(supplierItemLinks)
            .innerJoin(variants, eq(variants.id, supplierItemLinks.variantId))
            .innerJoin(products, eq(products.id, variants.productId))
            .where(
              and(
                eq(supplierItemLinks.supplierDocument, supplierDocument),
                inArray(supplierItemLinks.supplierCode, codes),
              ),
            )
        : [],
      barcodes.length ? base().where(inArray(variants.barcode, barcodes)) : [],
      codes.length
        ? base().where(
            inArray(
              sql`lower(${variants.sku})`,
              codes.map((c) => c.toLowerCase()),
            ),
          )
        : [],
    ])
    return { links, byBarcode, bySku }
  }

  /** Lembra (ou corrige) o vínculo código do fornecedor → variação. */
  async saveLinks(supplierDocument: string, links: { supplierCode: string; variantId: string }[], tx: DbOrTx) {
    if (!links.length) return
    await tx
      .insert(supplierItemLinks)
      .values(links.map((l) => ({ supplierDocument, ...l })))
      .onConflictDoUpdate({
        target: [supplierItemLinks.supplierDocument, supplierItemLinks.supplierCode],
        set: { variantId: sql`excluded.variant_id` },
      })
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

import { internalEan13, normalizeBarcode, normalizeSize, productCode, sizeSort, variantSku } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import type { Product, Variant } from '../../db/schema'
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../../shared/errors'
import type { MediaStorage } from '../../shared/media-storage'
import type { WebOrdersRepository } from '../web-orders/web-orders.repository'
import { isUniqueViolation } from '../../shared/sql'
import type { AuditService } from '../audit/audit.service'
import type { SettingsService } from '../settings/settings.service'
import type { MovementInput, StockService } from '../stock/stock.service'
import { coverUrl, toProductDto, toVariantDto } from './products.mapper'
import type { ProductChanges, ProductsRepository, VariantChanges } from './products.repository'
import type {
  CreateProductInput,
  ListProductsFilters,
  NewVariantInput,
  ProductsFromInvoiceInput,
  UpdateProductInput,
  UpdateVariantInput,
} from './products.schemas'

/** De onde veio o saldo inicial: cadastro manual ou um lote de importação. */
export interface StockOrigin {
  refType: 'manual' | 'import'
  refId: string | null
}
const MANUAL: StockOrigin = { refType: 'manual', refId: null }

const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ')
const optionalText = (value: string | null | undefined) => (value?.trim() ? cleanText(value) : null)
/** Chave de unicidade da variação (RN-PRO-02): sem diferenciar maiúsculas, ignorando espaços nas pontas. */
const variantKey = (color: string, size: string) =>
  `${cleanText(color).toLowerCase()}|${normalizeSize(size).toLowerCase()}`

export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly stock: StockService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly media: MediaStorage,
    private readonly webOrders: Pick<WebOrdersRepository, 'hasItemsFor'>,
  ) {}

  async list(filters: ListProductsFilters) {
    const result = await this.repo.list(filters)
    const byProduct = Map.groupBy(result.variants, (v) => v.productId)
    const images = Map.groupBy(await this.repo.findImages(result.items.map((p) => p.id)), (i) => i.productId)
    return {
      items: result.items.map((p) => toProductDto(p, byProduct.get(p.id) ?? [], images.get(p.id))),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    }
  }

  async get(id: string, tx?: DbOrTx) {
    const product = await this.requireProduct(id, tx)
    const variants = await this.repo.findVariants(id, tx)
    return toProductDto(product, variants, await this.repo.findImages([id], tx))
  }

  suggestions() {
    return this.repo.suggestions()
  }

  /** Uma variação com o nome do produto (telas de entrada e acerto abertas a partir de uma variação). */
  async getVariant(id: string) {
    const variant = await this.requireVariant(id)
    const product = await this.requireProduct(variant.productId)
    const images = await this.repo.findImages([product.id])
    return { ...toVariantDto(variant, product), productName: product.name, coverUrl: coverUrl(images, variant.color) }
  }

  async searchVariants(q: string, limit = 20) {
    const rows = await this.repo.searchVariants(q, limit)
    const images = Map.groupBy(
      await this.repo.findImages([...new Set(rows.map((r) => r.product.id))]),
      (i) => i.productId,
    )
    return rows.map(({ variant, product }) => ({
      ...toVariantDto(variant, product),
      productName: product.name,
      coverUrl: coverUrl(images.get(product.id) ?? [], variant.color),
    }))
  }

  /** RN-PRO-01: produto precisa de nome, preço base e ao menos uma variação. Saldo inicial gera movimento `initial`. */
  async create(input: CreateProductInput, userId: string) {
    return this.withUniqueGuard(() =>
      db.transaction(async (tx) => this.get(await this.createWithin(tx, input, userId), tx)),
    )
  }

  /** Cria dentro de uma transação já aberta (usado também pela importação). Devolve o id do produto. */
  async createWithin(tx: DbOrTx, input: CreateProductInput, userId: string, origin: StockOrigin = MANUAL) {
    this.assertUniqueVariants(input.variants)
    const product = await this.repo.insertProduct(
      {
        name: cleanText(input.name),
        basePriceCents: input.basePriceCents,
        // RN-PRO-15: sem referência, recebe o próximo código padrão (P00001…)
        reference: optionalText(input.reference) ?? productCode(await this.repo.nextProductCode(tx)),
        category: optionalText(input.category),
        description: input.description?.trim() || null,
        costCents: input.costCents ?? null,
      },
      tx,
    )
    await this.insertVariants(product, input.variants, userId, tx, origin)
    await this.audit.record({ entity: 'product', entityId: product.id, action: 'create', userId }, tx)
    return product.id
  }

  async update(id: string, input: UpdateProductInput, userId: string) {
    return db.transaction(async (tx) => {
      const before = await this.requireProduct(id, tx, true)
      const changes: ProductChanges = {}
      if (input.name !== undefined) changes.name = cleanText(input.name)
      if (input.basePriceCents !== undefined) changes.basePriceCents = input.basePriceCents
      if ('reference' in input) changes.reference = optionalText(input.reference)
      if ('category' in input) changes.category = optionalText(input.category)
      if ('description' in input) changes.description = input.description?.trim() || null
      if ('costCents' in input) changes.costCents = input.costCents ?? null
      if (input.showOnSite !== undefined) changes.showOnSite = input.showOnSite
      if ('sitePriceCents' in input) changes.sitePriceCents = input.sitePriceCents ?? null
      if (input.hideSitePrice !== undefined) changes.hideSitePrice = input.hideSitePrice
      if ('siteCompareAtCents' in input) changes.siteCompareAtCents = input.siteCompareAtCents ?? null
      if (input.siteUnlisted !== undefined) changes.siteUnlisted = input.siteUnlisted
      if ('siteDescription' in input) changes.siteDescription = input.siteDescription?.trim() || null

      const after = await this.repo.updateProduct(id, changes, tx)
      // RN-PRO-06: vendas confirmadas guardam nome e preço próprios; aqui só auditamos a mudança.
      const audited = (['name', 'basePriceCents', 'showOnSite', 'sitePriceCents'] as const).filter(
        (k) => before[k] !== after[k],
      )
      if (audited.length > 0) {
        await this.audit.record(
          {
            entity: 'product',
            entityId: id,
            action: 'update',
            before: Object.fromEntries(audited.map((k) => [k, before[k]])),
            after: Object.fromEntries(audited.map((k) => [k, after[k]])),
            userId,
          },
          tx,
        )
      }
      return this.get(id, tx)
    })
  }

  async addVariants(productId: string, variants: NewVariantInput[], userId: string) {
    return this.withUniqueGuard(() =>
      db.transaction(async (tx) => {
        await this.addVariantsWithin(tx, productId, variants, userId)
        return this.get(productId, tx)
      }),
    )
  }

  async addVariantsWithin(
    tx: DbOrTx,
    productId: string,
    variants: NewVariantInput[],
    userId: string,
    origin: StockOrigin = MANUAL,
  ) {
    const product = await this.requireProduct(productId, tx, true)
    this.assertUniqueVariants(variants, await this.repo.findVariants(productId, tx))
    await this.insertVariants(product, variants, userId, tx, origin)
  }

  async updateVariant(id: string, input: UpdateVariantInput, userId: string) {
    return this.withUniqueGuard(() =>
      db.transaction(async (tx) => {
        const before = await this.requireVariant(id, tx)
        const product = await this.requireProduct(before.productId, tx, true)
        const changes: VariantChanges = {}

        if (input.color !== undefined || input.size !== undefined) {
          // RN-PRO-09: corrigir rótulo é permitido (vendas antigas mantêm o rótulo antigo), sem colidir com outra variação.
          const color = cleanText(input.color ?? before.color)
          const size = normalizeSize(input.size ?? before.size)
          const others = (await this.repo.findVariants(product.id, tx)).filter((v) => v.id !== id)
          this.assertUniqueVariants([{ color, size }], others)
          Object.assign(changes, { color, size, sizeSort: sizeSort(size) })
        }
        if ('priceCents' in input) changes.priceCents = input.priceCents ?? null
        if ('costCents' in input) changes.costCents = input.costCents ?? null
        if ('sku' in input) changes.sku = optionalText(input.sku)
        if ('barcode' in input) changes.barcode = this.barcodeOf(input.barcode)
        if ('minStock' in input) changes.minStock = input.minStock ?? null
        if (input.active !== undefined) changes.active = input.active

        const after = await this.repo.updateVariant(id, changes, tx)
        const audited = (['color', 'size', 'priceCents', 'active'] as const).filter((k) => before[k] !== after[k])
        if (audited.length > 0) {
          await this.audit.record(
            {
              entity: 'variant',
              entityId: id,
              action: 'update',
              before: Object.fromEntries(audited.map((k) => [k, before[k]])),
              after: Object.fromEntries(audited.map((k) => [k, after[k]])),
              userId,
            },
            tx,
          )
        }
        return toVariantDto(after, product)
      }),
    )
  }

  /** RN-EST-09: mesmo alerta mínimo para todas as variações do produto. */
  async setMinStock(productId: string, minStock: number | null) {
    return db.transaction(async (tx) => {
      await this.requireProduct(productId, tx, true)
      await this.repo.setMinStock(productId, minStock, tx)
      return this.get(productId, tx)
    })
  }

  /** RN-PRO-07: inativar tira o produto do PDV e das listas padrão; histórico e relatórios continuam. */
  async setActive(productId: string, active: boolean, userId: string) {
    return db.transaction(async (tx) => {
      const before = await this.requireProduct(productId, tx, true)
      if (before.active !== active) {
        await this.repo.updateProduct(productId, { active }, tx)
        const action = active ? 'activate' : 'deactivate'
        await this.audit.record({ entity: 'product', entityId: productId, action, userId }, tx)
      }
      return this.get(productId, tx)
    })
  }

  /** RN-PRO-08: excluir só cadastro errado, sem nenhum histórico; caso contrário, inativar. */
  async remove(productId: string, userId: string) {
    const images = await db.transaction(async (tx) => {
      const product = await this.requireProduct(productId, tx, true)
      const variants = await this.repo.findVariants(productId, tx)
      await this.assertNoHistory(
        variants.map((v) => v.id),
        tx,
        'Este produto já tem movimentações. Ele não pode ser excluído, só inativado.',
      )
      const images = await this.repo.findImages([productId], tx)
      await this.repo.deleteProduct(productId, tx)
      await this.audit.record({ entity: 'product', entityId: productId, action: 'delete', before: product, userId }, tx)
      return images
    })
    // arquivos só depois do commit: se a transação falhar, as fotos continuam
    for (const image of images) await this.media.remove(image.id)
  }

  async removeVariant(id: string, userId: string) {
    await db.transaction(async (tx) => {
      const variant = await this.requireVariant(id, tx)
      await this.requireProduct(variant.productId, tx, true)
      const siblings = await this.repo.findVariants(variant.productId, tx)
      if (siblings.length === 1) {
        throw new BusinessRuleError('O produto precisa de pelo menos uma variação. Exclua o produto inteiro.')
      }
      await this.assertNoHistory(
        [id],
        tx,
        'Esta variação já tem movimentações. Ela não pode ser excluída, só inativada.',
      )
      await this.repo.deleteVariant(id, tx)
      await this.audit.record({ entity: 'variant', entityId: id, action: 'delete', before: variant, userId }, tx)
    })
  }

  private async insertVariants(
    product: Product,
    inputs: NewVariantInput[],
    userId: string,
    tx: DbOrTx,
    origin: StockOrigin,
  ) {
    const created = await this.repo.insertVariants(
      inputs.map((input) => {
        const size = normalizeSize(input.size)
        return {
          productId: product.id,
          color: cleanText(input.color),
          size,
          sizeSort: sizeSort(size),
          priceCents: input.priceCents ?? null,
          costCents: input.costCents ?? null,
          // RN-PRO-15: SKU padrão a partir da referência, cor e tamanho
          sku: optionalText(input.sku) ?? (product.reference ? variantSku(product.reference, input.color, size) : null),
          barcode: this.barcodeOf(input.barcode),
          minStock: input.minStock ?? null,
        }
      }),
      tx,
    )
    // RN-EST-02: saldo inicial vira movimento `initial` (variações vêm na mesma ordem do insert).
    const movements: MovementInput[] = created.flatMap((variant, i) => {
      const qty = inputs[i]!.initialQty ?? 0
      return qty > 0 ? [{ variantId: variant.id, type: 'initial', delta: qty, ...origin }] : []
    })
    if (movements.length > 0) {
      const businessDate = await this.settings.businessDate(new Date(), tx)
      await this.stock.apply(tx, movements, { businessDate, userId })
    }
  }

  private assertUniqueVariants(inputs: { color: string; size: string }[], existing: Variant[] = []) {
    const seen = new Set(existing.map((v) => variantKey(v.color, v.size)))
    for (const input of inputs) {
      const key = variantKey(input.color, input.size)
      if (seen.has(key)) {
        throw new ConflictError(
          `A variação ${cleanText(input.color)} / ${normalizeSize(input.size)} já existe neste produto.`,
        )
      }
      seen.add(key)
    }
  }

  /** Histórico = movimento de estoque ou item em qualquer venda (inclusive rascunho). */
  private async assertNoHistory(variantIds: string[], tx: DbOrTx, message: string) {
    const hasHistory =
      (await this.stock.hasMovements(variantIds, tx)) ||
      (await this.repo.hasSaleItems(variantIds, tx)) ||
      (await this.webOrders.hasItemsFor(variantIds, tx))
    if (hasHistory) throw new BusinessRuleError(message)
  }

  /**
   * RN-EST-12: cadastra de uma vez os produtos que vieram na nota e ainda não existem (agrupados por nome, com
   * as cores e tamanhos da nota, custo da nota e o preço de venda que a dona definiu). Se o produto já existe,
   * só acrescenta as variações que faltam. Saldo inicial zero: quem soma o estoque é a entrada da nota.
   */
  async createFromInvoice(input: ProductsFromInvoiceInput, userId: string) {
    return this.withUniqueGuard(() =>
      db.transaction(async (tx) => {
        const created: { name: string; color: string; size: string; variantId: string }[] = []
        for (const p of input.products) {
          const existing = await this.repo.findProductByName(cleanText(p.name), tx)
          let productId: string
          if (existing) {
            const current = await this.repo.findVariants(existing.id, tx)
            const missing = p.variants.filter(
              (v) => !current.some((c) => variantKey(c.color, c.size) === variantKey(v.color, v.size)),
            )
            if (missing.length) await this.addVariantsWithin(tx, existing.id, missing, userId)
            productId = existing.id
          } else {
            productId = await this.createWithin(
              tx,
              {
                name: p.name,
                category: p.category,
                basePriceCents: p.basePriceCents,
                costCents: p.costCents,
                variants: p.variants,
              },
              userId,
            )
          }
          for (const v of await this.repo.findVariants(productId, tx)) {
            if (p.variants.some((w) => variantKey(w.color, w.size) === variantKey(v.color, v.size))) {
              created.push({ name: p.name, color: v.color, size: v.size, variantId: v.id })
            }
          }
        }
        return created
      }),
    )
  }

  /** Tela Códigos e etiquetas: referência, SKU, código de barras e códigos dos fornecedores de cada peça. */
  listCodes(filters: { q?: string; missing?: boolean; ids?: string[] }) {
    return this.repo.codes(filters)
  }

  /**
   * RN-PRO-16: gera o código de barras interno (EAN-13 “20…”) das peças que ainda não têm, e o SKU padrão
   * das que estão sem SKU. Peça que já tem código (da etiqueta do fornecedor ou da NF-e) fica como está.
   */
  async generateCodes(variantIds: string[] | undefined, userId: string) {
    return db.transaction(async (tx) => {
      const rows = await this.repo.codes({ incomplete: !variantIds?.length, ids: variantIds })
      let generated = 0
      for (const row of rows) {
        const changes: VariantChanges = {}
        if (!row.barcode) changes.barcode = internalEan13(await this.repo.nextBarcodeNumber(tx))
        if (!row.sku && row.reference) changes.sku = variantSku(row.reference, row.color, row.size)
        if (Object.keys(changes).length === 0) continue
        await this.repo.updateVariant(row.variantId, changes, tx)
        generated++
      }
      if (generated) {
        await this.audit.record(
          { entity: 'variant', entityId: 'lote', action: 'generate_codes', after: { generated }, userId },
          tx,
        )
      }
      return { generated }
    })
  }

  /** Leitor/câmera: a peça do código, já no formato da busca do PDV. */
  async findByCode(code: string) {
    const row = await this.repo.findByCode(code.trim())
    if (!row) throw new NotFoundError(`Nenhuma peça com o código ${code.trim()}.`)
    const images = await this.repo.findImages([row.product.id])
    return {
      ...toVariantDto(row.variant, row.product),
      productName: row.product.name,
      coverUrl: coverUrl(images, row.variant.color),
    }
  }

  /** Código de barras digitado: só dígitos (8 a 14); texto preenchido e inválido é erro. */
  private barcodeOf(text: string | null | undefined) {
    if (!text?.trim()) return null
    const barcode = normalizeBarcode(text)
    if (!barcode) throw new ValidationError('Código de barras inválido: use de 8 a 14 números.', { field: 'barcode' })
    return barcode
  }

  /** Corrida entre dois aparelhos criando a mesma variação: o índice único do banco decide. */
  private async withUniqueGuard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (isUniqueViolation(error, 'variants_barcode_uq')) {
        throw new ConflictError('Este código de barras já está em outra variação.')
      }
      if (isUniqueViolation(error)) throw new ConflictError('Já existe uma variação com esta cor e tamanho.')
      throw error
    }
  }

  private async requireProduct(id: string, tx?: DbOrTx, lock = false) {
    const product = await this.repo.findProduct(id, tx, lock)
    if (!product) throw new NotFoundError('Produto não encontrado.')
    return product
  }

  private async requireVariant(id: string, tx?: DbOrTx) {
    const variant = await this.repo.findVariant(id, tx)
    if (!variant) throw new NotFoundError('Variação não encontrada.')
    return variant
  }
}

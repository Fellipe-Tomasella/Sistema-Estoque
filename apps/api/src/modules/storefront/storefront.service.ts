import { normalizeWhatsapp, storeSlugProblem } from '@estoque/shared'
import { db } from '../../db/client'
import type { StorefrontSettings } from '../../db/schema'
import { ValidationError } from '../../shared/errors'
import { mediaUrl } from '../../shared/media-storage'
import type { AuditService } from '../audit/audit.service'
import type { SettingsService } from '../settings/settings.service'
import type { CatalogEntry, StorefrontRepository, StorefrontSettingsUpdate } from './storefront.repository'
import type { UpdateStorefrontInput } from './storefront.schemas'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX_COLOR = /^#[0-9a-f]{6}$/i

/** Produto como o site mostra: sem custo nem saldo, só o que está disponível (RN-LOJ-01 a 04). */
export function toPublicProduct({ product, variants, images }: CatalogEntry) {
  const prices = variants.map((v) => v.priceCents ?? product.basePriceCents)
  const minPrice = prices.length ? Math.min(...prices) : product.basePriceCents
  const colors = [...new Set(variants.map((v) => v.color))].map((color) => ({
    color,
    sizes: variants
      .filter((v) => v.color === color)
      .map((v) => ({ variantId: v.id, size: v.size, available: v.stockQty > 0 })),
  }))
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.siteDescription,
    /** null = “Consulte” (RN-LOJ-03). */
    priceCents: product.hideSitePrice ? null : (product.sitePriceCents ?? minPrice),
    /** Variações com preços diferentes e sem preço do site: “a partir de”. */
    priceFrom: !product.hideSitePrice && product.sitePriceCents === null && new Set(prices).size > 1,
    /** RN-LOJ-09: “de” riscado só quando maior que o preço mostrado. */
    compareAtCents:
      !product.hideSitePrice &&
      product.siteCompareAtCents !== null &&
      product.siteCompareAtCents > (product.sitePriceCents ?? minPrice)
        ? product.siteCompareAtCents
        : null,
    unlisted: product.siteUnlisted,
    soldOut: !variants.some((v) => v.stockQty > 0),
    colors,
    images: images.map((i) => ({
      color: i.color,
      thumbUrl: mediaUrl(i.id, 'thumb'),
      largeUrl: mediaUrl(i.id, 'large'),
      width: i.width,
      height: i.height,
    })),
  }
}
export type PublicProduct = ReturnType<typeof toPublicProduct>

export class StorefrontService {
  constructor(
    private readonly repo: StorefrontRepository,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  getSettings(): Promise<StorefrontSettings> {
    return this.repo.getSettings()
  }

  async updateSettings(input: UpdateStorefrontInput, userId: string): Promise<StorefrontSettings> {
    const changes = this.normalize(input)
    return db.transaction(async (tx) => {
      const before = await this.repo.getSettings(tx)
      const after = await this.repo.updateSettings(changes, tx)
      if (after.enabled && !after.slug) {
        throw new ValidationError('Escolha o endereço do site antes de colocá-lo no ar.', { field: 'slug' })
      }
      await this.audit.record(
        { entity: 'storefront_settings', entityId: '1', action: 'update', before, after, userId },
        tx,
      )
      return after
    })
  }

  /** Site do endereço pedido: configuração, nome exibido e produtos visíveis. null = não é o site. */
  async site(slug: string) {
    const settings = await this.repo.getSettings()
    if (!settings.slug || settings.slug !== slug) return null
    const store = await this.settings.get()
    // RN-LOJ-01: “só pelo link” fica fora das vitrines (a página do produto abre normalmente)
    const products = (await this.repo.catalog()).map(toPublicProduct).filter((p) => !p.unlisted)
    return {
      settings,
      title: settings.title ?? store.storeName,
      products: settings.hideSoldOut ? products.filter((p) => !p.soldOut) : products,
    }
  }

  async product(id: string) {
    const [entry] = await this.repo.catalog(id)
    return entry ? toPublicProduct(entry) : null
  }

  private normalize(input: UpdateStorefrontInput): StorefrontSettingsUpdate {
    const changes: StorefrontSettingsUpdate = {}
    const text = (value: string | null | undefined) => (value?.trim() ? value.trim() : null)

    if (input.enabled !== undefined) changes.enabled = input.enabled
    if (input.hideSoldOut !== undefined) changes.hideSoldOut = input.hideSoldOut
    if (input.notesRequired !== undefined) changes.notesRequired = input.notesRequired
    for (const key of ['title', 'tagline', 'about', 'checkoutNotice', 'notesLabel'] as const)
      if (key in input) changes[key] = text(input[key])

    if ('slug' in input) {
      const slug = text(input.slug)
      const problem = slug && storeSlugProblem(slug)
      if (problem) throw new ValidationError(problem, { field: 'slug' })
      changes.slug = slug
    }
    if ('whatsapp' in input) {
      const typed = text(input.whatsapp)
      const whatsapp = typed && normalizeWhatsapp(typed)
      if (typed && !whatsapp) {
        throw new ValidationError('WhatsApp inválido. Use DDD + número (ex.: 11 99999-8888).', { field: 'whatsapp' })
      }
      changes.whatsapp = whatsapp || null
    }
    if ('instagram' in input) changes.instagram = text(input.instagram)?.replace(/^@/, '') ?? null
    if ('notifyEmail' in input) {
      const email = text(input.notifyEmail)?.toLowerCase() ?? null
      if (email && !EMAIL.test(email)) throw new ValidationError('E-mail inválido.', { field: 'notifyEmail' })
      changes.notifyEmail = email
    }
    if (input.accentColor !== undefined) {
      if (!HEX_COLOR.test(input.accentColor)) throw new ValidationError('Cor inválida.', { field: 'accentColor' })
      changes.accentColor = input.accentColor.toLowerCase()
    }
    return changes
  }
}

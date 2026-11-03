import { normalizeWhatsapp } from '@estoque/shared'
import { db, type DbOrTx } from '../../db/client'
import type { WebOrder, WebOrderItem } from '../../db/schema'
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  TooManyAttemptsError,
  ValidationError,
} from '../../shared/errors'
import type { Mailer } from '../../shared/mailer'
import { RateLimiter } from '../../shared/rate-limiter'
import { isUniqueViolation } from '../../shared/sql'
import type { AuditService } from '../audit/audit.service'
import type { CustomersService } from '../customers/customers.service'
import type { SaleDraftsService } from '../sales/sale-drafts.service'
import type { SettingsService } from '../settings/settings.service'
import type { StorefrontRepository } from '../storefront/storefront.repository'
import { customerEmail, sellerEmail } from './web-order-emails'
import type { WebOrdersRepository } from './web-orders.repository'
import type { CreateWebOrderInput, WebOrderStatusInput } from './web-orders.schemas'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINUTE = 60_000

const toDto = (order: WebOrder, items: WebOrderItem[]) => ({ ...order, items })
export type WebOrderDto = ReturnType<typeof toDto>

/**
 * Pedidos do site (docs/11 §5, RN-LOJ-05 a 08): chegam sem login, não mexem no estoque e viram venda
 * pelo PDV, com o fluxo normal de confirmação, pagamento e fiado.
 */
export class WebOrdersService {
  /** RN-LOJ-05: até 5 pedidos a cada 10 minutos por IP. */
  private readonly limiter = new RateLimiter(5, 10 * MINUTE)

  constructor(
    private readonly repo: WebOrdersRepository,
    private readonly storefront: StorefrontRepository,
    private readonly customers: CustomersService,
    private readonly drafts: SaleDraftsService,
    private readonly settings: SettingsService,
    private readonly mailer: Mailer,
    private readonly audit: AuditService,
    private readonly origin: string,
  ) {}

  /** Envio do site. A chave do envio vira o id: repetir o envio devolve o mesmo pedido (RN-LOJ-05). */
  async create(input: CreateWebOrderInput, key: string, ip: string | null) {
    const existing = await this.repo.find(key)
    if (existing) return this.publicView(existing)
    // campo isca preenchido: robô. Responde como se tivesse dado certo e não grava nada.
    if (input.website) return { number: null, totalCents: 0 }

    const limiterKey = ip ?? '?'
    if (this.limiter.isBlocked(limiterKey)) {
      throw new TooManyAttemptsError('Muitos pedidos seguidos. Espere alguns minutos ou chame a loja no WhatsApp.')
    }
    const site = await this.storefront.getSettings()
    if (!site.enabled) throw new BusinessRuleError('A loja está fora do ar no momento.')
    // RN-LOJ-10: a dona pode tornar a observação obrigatória (ex.: “Medidas” ou “Tamanho do sutiã”)
    if (site.notesRequired && !input.notes?.trim()) {
      throw new ValidationError(`Preencha o campo “${site.notesLabel ?? 'Observação'}”.`, { field: 'notes' })
    }
    if (!input.consent) throw new ValidationError('É preciso aceitar a política de privacidade.', { field: 'consent' })
    const whatsapp = normalizeWhatsapp(input.whatsapp)
    if (!whatsapp) throw new ValidationError('WhatsApp inválido. Use DDD + número.', { field: 'whatsapp' })
    const email = input.email?.trim().toLowerCase() || null
    if (email && !EMAIL.test(email)) throw new ValidationError('E-mail inválido.', { field: 'email' })

    const items = await this.priceItems(input.items)
    this.limiter.hit(limiterKey)
    let order: WebOrder
    try {
      order = await db.transaction((tx) =>
        this.repo.insert(
          {
            id: key,
            customerName: input.name.trim().replace(/\s+/g, ' '),
            whatsapp,
            email,
            city: input.city?.trim() || null,
            notes: input.notes?.trim() || null,
            totalCents: items.reduce((sum, i) => sum + (i.unitPriceCents ?? 0) * i.quantity, 0),
            hasHiddenPrices: items.some((i) => i.unitPriceCents === null),
          },
          items,
          tx,
        ),
      )
    } catch (error) {
      // mesmo envio chegando duas vezes ao mesmo tempo
      if (isUniqueViolation(error)) return this.publicView((await this.repo.find(key))!)
      throw error
    }
    void this.notify(order, site.notifyEmail, site.title, site.whatsapp)
    return this.publicView(order)
  }

  async list(status: 'open' | 'closed' = 'open') {
    const orders = await this.repo.list(status === 'open' ? ['new', 'contacted'] : ['converted', 'declined'])
    const items = Map.groupBy(await this.repo.items(orders.map((o) => o.id)), (i) => i.orderId)
    return orders.map((o) => toDto(o, items.get(o.id) ?? []))
  }

  countNew() {
    return this.repo.countNew()
  }

  async get(id: string) {
    const order = await this.require(id)
    return toDto(order, await this.repo.items([id]))
  }

  /** Atendido (falou com a cliente), recusado (com motivo) ou de volta para novo. Convertido não muda. */
  async setStatus(id: string, input: WebOrderStatusInput, userId: string) {
    return db.transaction(async (tx) => {
      const order = await this.require(id, tx, true)
      if (order.status === 'converted') throw new BusinessRuleError('Este pedido já virou venda.')
      const reason = input.reason?.trim() || null
      if (input.status === 'declined' && !reason) {
        throw new ValidationError('Informe o motivo da recusa.', { field: 'reason' })
      }
      const updated = await this.repo.update(
        id,
        {
          status: input.status,
          declineReason: input.status === 'declined' ? reason : null,
          contactedAt: input.status === 'contacted' ? (order.contactedAt ?? new Date()) : order.contactedAt,
        },
        tx,
      )
      await this.audit.record(
        { entity: 'web_order', entityId: id, action: input.status, before: { status: order.status }, userId },
        tx,
      )
      return toDto(updated, await this.repo.items([id], tx))
    })
  }

  /**
   * RN-LOJ-07: abre um rascunho no PDV com a cliente (achada pelo WhatsApp ou criada agora) e as peças.
   * O preço do site menor que o do PDV entra como desconto em reais, com a explicação na observação.
   * O estoque só baixa quando a venda for confirmada (regras normais do PDV).
   */
  async convert(id: string, userId: string) {
    const order = await this.require(id)
    if (order.status === 'converted') throw new ConflictError('Este pedido já virou venda.', { saleId: order.saleId })
    if (order.status === 'declined') throw new BusinessRuleError('Pedido recusado. Volte-o para “novo” antes.')
    const items = await this.repo.items([id])

    const customerId = await this.findOrCreateCustomer(order)
    const draft = await this.drafts.create(userId)
    const sale = await this.drafts.update(draft.id, {
      version: draft.version,
      customerId,
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      notes: `Pedido do site nº ${order.number}.${order.notes ? ` Obs. da cliente: ${order.notes}` : ''}`,
    })
    const pdvPrices = new Map(sale.items.map((line) => [line.variantId, line.unitPriceCents]))
    const discountCents = items.reduce((sum, i) => {
      const pdv = pdvPrices.get(i.variantId)
      return i.unitPriceCents !== null && pdv !== undefined && i.unitPriceCents < pdv
        ? sum + (pdv - i.unitPriceCents) * i.quantity
        : sum
    }, 0)
    if (discountCents > 0) {
      await this.drafts.update(draft.id, {
        version: sale.version,
        discount: { kind: 'amount', value: discountCents },
        notes: `${sale.notes} Desconto = diferença para o preço do site.`,
      })
    }

    if (!(await this.repo.markConverted(id, draft.id))) {
      await this.drafts.discard(draft.id)
      throw new ConflictError('Este pedido já virou venda em outro aparelho.')
    }
    await this.audit.record({
      entity: 'web_order',
      entityId: id,
      action: 'convert',
      after: { saleId: draft.id },
      userId,
    })
    return { saleId: draft.id }
  }

  /** Preço que o site mostra agora (RN-LOJ-02/03); peça fora do site ou esgotada não entra. */
  private async priceItems(requested: CreateWebOrderInput['items']) {
    const catalog = await this.storefront.catalog()
    const byVariant = new Map(
      catalog.flatMap(({ product, variants }) =>
        variants.map((variant) => [variant.id, { product, variant }] as const),
      ),
    )
    const merged = new Map<string, number>()
    for (const item of requested) merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity)

    return [...merged].map(([variantId, quantity]) => {
      const found = byVariant.get(variantId)
      if (!found) throw new BusinessRuleError('Uma das peças saiu do site. Atualize a sacola e tente de novo.')
      const { product, variant } = found
      const label = `${variant.color} / ${variant.size}`
      if (variant.stockQty <= 0) {
        throw new BusinessRuleError(`${product.name} (${label}) esgotou. Tire da sacola para enviar o pedido.`)
      }
      return {
        variantId,
        productName: product.name,
        variantLabel: label,
        unitPriceCents: product.hideSitePrice
          ? null
          : (product.sitePriceCents ?? variant.priceCents ?? product.basePriceCents),
        quantity: Math.min(quantity, 20),
      }
    })
  }

  private async findOrCreateCustomer(order: WebOrder) {
    const local = order.whatsapp.replace(/^55/, '')
    const { items } = await this.customers.list({ q: local, status: 'active', pageSize: 20 })
    const match = items.find((c) => c.phone && c.phone.replace(/\D/g, '').endsWith(local))
    if (match) return match.id
    const created = await this.customers.create({
      name: order.customerName,
      phone: local,
      email: order.email,
      notes: `Veio pelo site (pedido nº ${order.number})${order.city ? ` · ${order.city}` : ''}.`,
    })
    return created.id
  }

  /** E-mails depois de gravar: falha de envio não perde o pedido (ele já aparece no sistema). */
  private async notify(order: WebOrder, to: string | null, title: string | null, whatsapp: string | null) {
    const items = await this.repo.items([order.id])
    const ctx = {
      storeTitle: title ?? (await this.settings.get()).storeName,
      origin: this.origin,
      storeWhatsapp: whatsapp,
    }
    const messages = [
      to ? sellerEmail(order, items, ctx, to) : null,
      order.email ? customerEmail(order, items, ctx) : null,
    ]
    for (const message of messages) {
      if (!message) continue
      try {
        await this.mailer.send(message)
      } catch (error) {
        console.error(`E-mail do pedido do site nº ${order.number} não saiu:`, error)
      }
    }
  }

  private publicView(order: WebOrder) {
    return { number: order.number, totalCents: order.totalCents }
  }

  private async require(id: string, tx: DbOrTx = db, lock = false) {
    const order = await this.repo.find(id, tx, lock)
    if (!order) throw new NotFoundError('Pedido não encontrado.')
    return order
  }
}

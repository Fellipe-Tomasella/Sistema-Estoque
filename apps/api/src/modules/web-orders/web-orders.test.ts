import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { stockMovements, variants } from '../../db/schema'
import { services } from '../../container'
import type { MemoryMailer } from '../../shared/mailer'
import { resetDatabase } from '../../../test/db'
import { createCustomer, createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

const mailer = services.mailer as MemoryMailer
let cookie: string
let userId: string
let variantP: string
let variantM: string
let productId: string

beforeEach(async () => {
  await resetDatabase()
  mailer.outbox.length = 0
  const session = await loggedIn()
  cookie = session.cookie
  userId = session.user.id
  await services.storefront.updateSettings(
    { slug: 'jooliv-lingeries', enabled: true, title: 'Jooliv Lingeries', notifyEmail: 'vendedora@loja.test' },
    userId,
  )
  const product = await createProduct(userId, {
    name: 'Body renda',
    basePriceCents: 10000,
    variants: [
      ['Preta', 'P', 2],
      ['Preta', 'M', 1],
    ],
  })
  productId = product.id
  await services.products.update(product.id, { showOnSite: true, sitePriceCents: 8000 }, userId)
  variantP = product.variants.find((v) => v.size === 'P')!.id
  variantM = product.variants.find((v) => v.size === 'M')!.id
})

const order = (overrides: Record<string, unknown> = {}) => ({
  items: [
    { variantId: variantP, quantity: 1 },
    { variantId: variantM, quantity: 1 },
  ],
  name: 'Ana Souza',
  whatsapp: '(11) 98888-7777',
  email: 'ana@cliente.test',
  city: 'Campinas',
  consent: true,
  ...overrides,
})

// IP próprio por envio: o limite por IP vale para o processo inteiro de testes
const send = (body: unknown, key: string = crypto.randomUUID(), ip: string = crypto.randomUUID()) =>
  request('POST', '/public/orders', { body, headers: { 'idempotency-key': key, 'x-real-ip': ip } })

describe('pedido pelo site (sem login)', () => {
  test('RN-LOJ-05/06: grava com o preço do site, não mexe no estoque e avisa vendedora e cliente', async () => {
    const res = await send(order())
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ number: 1, totalCents: 16000 })

    const [variant] = await db.select().from(variants).where(eq(variants.id, variantP))
    expect(variant!.stockQty).toBe(2)
    const movements = await db.select().from(stockMovements).where(eq(stockMovements.refType, 'sale'))
    expect(movements).toHaveLength(0)

    await Bun.sleep(50)
    expect(mailer.outbox.map((m) => m.to)).toEqual(['vendedora@loja.test', 'ana@cliente.test'])
    expect(mailer.outbox[0]!.subject).toContain('nº 1')
    expect(mailer.outbox[0]!.text).toContain('https://wa.me/5511988887777')
    expect(mailer.outbox[0]!.text).toContain('R$ 160,00')
    expect(mailer.outbox[1]!.text).toContain('não é documento fiscal')
    // versão HTML com o nome da loja como remetente; a cliente responde para a vendedora
    expect(mailer.outbox[0]!.html).toContain('Chamar no WhatsApp')
    expect(mailer.outbox[1]).toMatchObject({ fromName: 'Jooliv Lingeries', replyTo: 'vendedora@loja.test' })
    expect(mailer.outbox[1]!.html).toContain('pedido nº 1')
  })

  test('RN-LOJ-05: mesmo envio duas vezes não duplica; campo isca não grava', async () => {
    const key = crypto.randomUUID()
    const [a, b] = await Promise.all([send(order(), key), send(order(), key)])
    expect([a.body.number, b.body.number]).toEqual([1, 1])
    expect(await services.webOrders.list()).toHaveLength(1)

    const bot = await send(order({ website: 'http://spam' }))
    expect(bot.status).toBe(201)
    expect(await services.webOrders.list()).toHaveLength(1)
  })

  test('recusa sem aceite, WhatsApp inválido, peça esgotada ou fora do site, e loja fora do ar', async () => {
    expect((await send(order({ consent: false }))).body.error.message).toContain('privacidade')
    expect((await send(order({ whatsapp: '1234' }))).status).toBe(400)

    await services.stockAdjustments.create(
      crypto.randomUUID(),
      { variantId: variantM, reason: 'count', countedQty: 0 },
      userId,
    )
    const soldOut = await send(order())
    expect(soldOut.status).toBe(422)
    expect(soldOut.body.error.message).toContain('esgotou')

    const other = await createProduct(userId, { name: 'Interno' })
    const hidden = await send(order({ items: [{ variantId: other.variants[0]!.id, quantity: 1 }] }))
    expect(hidden.body.error.message).toContain('saiu do site')

    await services.storefront.updateSettings({ enabled: false }, userId)
    expect((await send(order({ items: [{ variantId: variantP, quantity: 1 }] }))).body.error.message).toContain(
      'fora do ar',
    )
  })

  test('RN-LOJ-10: observação obrigatória quando a dona exige', async () => {
    await services.storefront.updateSettings({ notesRequired: true, notesLabel: 'Medidas' }, userId)
    const res = await send(order())
    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('Preencha o campo “Medidas”.')
    expect((await send(order({ notes: 'Busto 90' }))).status).toBe(201)
  })

  test('RN-LOJ-05: limite de pedidos por IP', async () => {
    const one = order({ items: [{ variantId: variantP, quantity: 1 }] })
    for (let i = 0; i < 5; i++) expect((await send(one, undefined, '10.9.9.9')).status).toBe(201)
    expect((await send(one, undefined, '10.9.9.9')).status).toBe(429)
    expect((await send(one, undefined, '10.9.9.8')).status).toBe(201)
  })
})

describe('pedidos do site no painel', () => {
  test('RN-LOJ-07: virar venda abre rascunho com a cliente nova, as peças e o preço do site como desconto', async () => {
    await send(order({ notes: 'Presente' }))
    const [listed] = (await request('GET', '/web-orders', { cookie })).body
    expect(listed.items).toHaveLength(2)

    const res = await request('POST', `/web-orders/${listed.id}/convert`, { cookie })
    expect(res.status).toBe(200)
    const sale = await services.sales.view(res.body.saleId)
    expect(sale.status).toBe('draft')
    expect(sale.items.map((i) => [i.variantId, i.quantity])).toEqual(
      expect.arrayContaining([
        [variantP, 1],
        [variantM, 1],
      ]),
    )
    expect(sale.subtotalCents).toBe(20000)
    expect(sale.totalCents).toBe(16000)
    expect(sale.notes).toContain('Pedido do site nº 1')
    expect(sale.notes).toContain('Presente')

    const customer = await services.customers.get(sale.customerId!)
    expect(customer).toMatchObject({ name: 'Ana Souza', phone: '11988887777', email: 'ana@cliente.test' })

    const again = await request('POST', `/web-orders/${listed.id}/convert`, { cookie })
    expect(again.status).toBe(409)
    expect((await services.webOrders.get(listed.id)).status).toBe('converted')
  })

  test('virar venda usa a cliente já cadastrada pelo WhatsApp', async () => {
    const existing = await createCustomer('Ana S.', { phone: '(11) 98888-7777' })
    await send(order())
    const [listed] = await services.webOrders.list()
    const { saleId } = await services.webOrders.convert(listed!.id, userId)
    expect((await services.sales.view(saleId)).customerId).toBe(existing.id)
  })

  test('atendido e recusado (com motivo); recusado sai da lista de abertos', async () => {
    await send(order())
    const [listed] = await services.webOrders.list()
    const contacted = await request('POST', `/web-orders/${listed!.id}/status`, {
      cookie,
      body: { status: 'contacted' },
    })
    expect(contacted.body.status).toBe('contacted')
    expect(contacted.body.contactedAt).toBeTruthy()

    const noReason = await request('POST', `/web-orders/${listed!.id}/status`, { cookie, body: { status: 'declined' } })
    expect(noReason.status).toBe(400)
    await request('POST', `/web-orders/${listed!.id}/status`, {
      cookie,
      body: { status: 'declined', reason: 'Cliente desistiu' },
    })
    expect(await services.webOrders.list('open')).toHaveLength(0)
    expect((await services.webOrders.list('closed'))[0]!.declineReason).toBe('Cliente desistiu')
    expect(await services.webOrders.countNew()).toBe(0)
  })

  test('produto com pedido do site não pode ser excluído (só inativado)', async () => {
    await send(order())
    const res = await request('DELETE', `/products/${productId}`, { cookie })
    expect(res.status).toBe(422)
  })
})

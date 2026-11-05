import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { products, receivables, sales } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createConfirmedSale, createCustomer, createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string
let today: string

beforeEach(async () => {
  await resetDatabase()
  ;({
    cookie,
    user: { id: userId },
  } = await loggedIn())
  today = await services.settings.businessDate()
})

const yesterdayOf = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

async function receive(customerId: string, receivableId: string, amountCents: number, method: 'cash' | 'pix') {
  return services.receivableReceipts.create(
    crypto.randomUUID(),
    { customerId, method, amountCents, allocations: [{ receivableId, amountCents }] },
    userId,
  )
}

describe('RN-FEC fechamento do dia', () => {
  test('aceite: um dia com venda à vista, fiado, recebimento antigo, cancelamento com devolução e estorno bate com a conta à mão', async () => {
    const ana = await createCustomer('Ana')
    const bia = await createCustomer('Bia')

    // 1. Venda em dinheiro R$ 100 e 2. venda no Pix R$ 50
    await createConfirmedSale(userId, { totalCents: 10000, payments: [{ method: 'cash', amountCents: 10000 }] })
    await createConfirmedSale(userId, { totalCents: 5000, payments: [{ method: 'pix', amountCents: 5000 }] })
    // 3. Venda R$ 80 com entrada de R$ 30 em dinheiro e R$ 50 no fiado
    await createConfirmedSale(userId, {
      totalCents: 8000,
      customerId: ana.id,
      payments: [{ method: 'cash', amountCents: 3000 }],
      fiado: true,
    })
    // 4. Fiado antigo de ontem (R$ 60), R$ 40 recebidos hoje no Pix
    const old = await createConfirmedSale(userId, { totalCents: 6000, customerId: bia.id, fiado: true })
    await db
      .update(sales)
      .set({ businessDate: yesterdayOf(today) })
      .where(eq(sales.id, old.id))
    await db
      .update(receivables)
      .set({ businessDate: yesterdayOf(today) })
      .where(eq(receivables.saleId, old.id))
    await receive(bia.id, old.receivable!.id, 4000, 'pix')
    // 5. Venda no cartão R$ 70 cancelada hoje; os R$ 70 devolvidos em dinheiro
    const card = await createConfirmedSale(userId, {
      totalCents: 7000,
      payments: [{ method: 'card', amountCents: 7000 }],
    })
    await services.cancellations.cancel(card.id, { reason: 'Desistiu', itemsWithStore: true }, userId)
    const [refund] = await services.refunds.list('pending')
    await services.refunds.markDone(refund!.id, { method: 'cash' }, userId)
    // 6. Recebimento de R$ 10 lançado por engano e estornado hoje
    const wrong = await receive(bia.id, old.receivable!.id, 1000, 'cash')
    await services.receivableReceipts.void(wrong.id, 'Lancei errado', userId)

    const res = await request('GET', `/closings/${today}`, { cookie })
    expect(res.body.totals).toEqual({
      sales: { count: 3, subtotalCents: 23000, discountCents: 0, totalCents: 23000, fiadoCents: 5000 },
      receivedAtSale: { cash: 13000, pix: 5000, card: 7000 },
      receivedFiado: { cash: 0, pix: 4000, card: 0 },
      received: { cash: 13000, pix: 9000, card: 7000 },
      refunded: { cash: 7000, pix: 0, card: 0 },
      balance: { cash: 6000, pix: 9000, card: 7000 },
      exchangeCreditCents: 0,
      expectedCashCents: 6000,
    })
    expect(res.body.labels.card).toBe('Transações de cartão registradas')
    expect(res.body.cancellations).toMatchObject([{ total_cents: 7000, reason: 'Desistiu' }])
    expect(res.body.voidedReceipts).toMatchObject([
      { amount_cents: 1000, reason: 'Lancei errado', original_date: today },
    ])

    // RN-FEC-05: dinheiro contado × esperado
    const saved = await request('PUT', `/closings/${today}`, { cookie, body: { countedCashCents: 5900 } })
    expect(saved.body.saved).toMatchObject({ expectedCashCents: 6000, countedCashCents: 5900, differenceCents: -100 })
    expect(saved.body.changedAfterClosing).toBe(false)

    // RN-FEC-06 / RN-FIA-07: estorno depois de fechado → “alterado depois” com as diferenças
    const [receipt] = (await services.receivables.byCustomer(bia.id)).receivables[0]!.receipts.filter(
      (r) => r.status === 'valid',
    )
    await services.receivableReceipts.void(receipt!.paymentId, 'Cliente não pagou', userId)
    const changed = await request('GET', `/closings/${today}`, { cookie })
    expect(changed.body.changedAfterClosing).toBe(true)
    expect(changed.body.differences).toContainEqual({ field: 'received.pix', before: 9000, after: 5000 })

    // Refazer guarda o retrato anterior no audit_log e volta a bater
    const redone = await request('PUT', `/closings/${today}`, { cookie, body: { countedCashCents: 6000 } })
    expect(redone.body).toMatchObject({ changedAfterClosing: false, saved: { differenceCents: 0 } })
  })

  test('A5 cartão aparece como transação registrada, não como saldo', async () => {
    await createConfirmedSale(userId, { totalCents: 7000, payments: [{ method: 'card', amountCents: 7000 }] })
    const res = await request('GET', `/closings/${today}`, { cookie })
    expect(res.body.totals.received.card).toBe(7000)
    expect(res.body.totals.expectedCashCents).toBe(0)
    expect(res.body.labels.card).toBe('Transações de cartão registradas')
  })

  test('dia futuro não fecha', async () => {
    expect((await request('GET', '/closings/2999-01-01', { cookie })).status).toBe(400)
  })
})

describe('RN-REL relatórios', () => {
  test('RN-REL-02 vendas por período: canceladas e devoluções separadas, sem somar', async () => {
    const product = await createProduct(userId, { name: 'Blusa', basePriceCents: 5000, variants: [['Preta', 'M', 10]] })
    const variantId = product.variants[0]!.id
    const a = await createConfirmedSale(userId, {
      items: [[variantId, 2]],
      payments: [{ method: 'cash', amountCents: 10000 }],
    })
    const b = await createConfirmedSale(userId, {
      items: [[variantId, 1]],
      payments: [{ method: 'pix', amountCents: 5000 }],
    })
    await services.cancellations.cancel(b.id, { reason: 'x', itemsWithStore: true }, userId)
    await services.partialReturns.execute(
      crypto.randomUUID(),
      a.id,
      {
        items: [{ saleItemId: (a.items[0] as { id: string }).id, quantity: 1, received: true, condition: 'sellable' }],
      },
      userId,
    )

    const res = await request('GET', `/reports/sales?from=${today}&to=${today}&groupBy=week`, { cookie })
    expect(res.body.totals).toEqual({ count: 1, subtotalCents: 10000, discountCents: 0, totalCents: 10000 })
    expect(res.body.sales[0].items).toEqual([
      { productName: 'Blusa', variantLabel: 'Preta / M', quantity: 2, lineTotalCents: 10000 },
    ])
    expect(res.body.cancelled).toMatchObject([{ numberLabel: '#000002', totalCents: 5000 }])
    expect(res.body.returns).toMatchObject({
      totalCents: 5000,
      items: [{ type: 'partial_return', saleNumberLabel: '#000001' }],
    })
  })

  test('RN-REL-04 mais e menos vendidos: líquido, inclui sem venda, ignora cancelada', async () => {
    const blusa = await createProduct(userId, { name: 'Blusa', basePriceCents: 1000, variants: [['Preta', 'M', 10]] })
    const saia = await createProduct(userId, { name: 'Saia', basePriceCents: 1000, variants: [['Rosa', 'P', 10]] })
    await createProduct(userId, { name: 'Vestido', basePriceCents: 1000, variants: [['Azul', 'U', 10]] })
    await createConfirmedSale(userId, {
      items: [[blusa.variants[0]!.id, 3]],
      payments: [{ method: 'cash', amountCents: 3000 }],
    })
    const cancelled = await createConfirmedSale(userId, {
      items: [[saia.variants[0]!.id, 5]],
      payments: [{ method: 'cash', amountCents: 5000 }],
    })
    await services.cancellations.cancel(cancelled.id, { reason: 'x', itemsWithStore: true }, userId)
    await createConfirmedSale(userId, {
      items: [[saia.variants[0]!.id, 1]],
      payments: [{ method: 'cash', amountCents: 1000 }],
    })

    const desc = await request('GET', `/reports/products-ranking?from=${today}&to=${today}`, { cookie })
    expect(desc.body.items.map((r: { productName: string; netQty: number }) => [r.productName, r.netQty])).toEqual([
      ['Blusa', 3],
      ['Saia', 1],
      ['Vestido', 0],
    ])
    const asc = await request('GET', `/reports/products-ranking?from=${today}&to=${today}&order=asc&level=variant`, {
      cookie,
    })
    expect(asc.body.items[0]).toMatchObject({ productName: 'Vestido', variantLabel: 'Azul / U', soldQty: 0 })
  })

  test('RN-REL-03 fiado em aberto por cliente', async () => {
    const ana = await createCustomer('Ana')
    await createConfirmedSale(userId, { totalCents: 3000, customerId: ana.id, fiado: true })
    await createConfirmedSale(userId, { totalCents: 2000, customerId: ana.id, fiado: true, fiadoDueDate: '2020-01-01' })
    const res = await request('GET', '/reports/receivables', { cookie })
    expect(res.body).toMatchObject({
      totalOpenCents: 5000,
      customers: [{ name: 'Ana', openBalanceCents: 5000, debts: 2, overdue: true }],
    })
  })

  test('RN-REL-06 CSV com separador “;”, vírgula decimal e acentos', async () => {
    await createConfirmedSale(userId, { totalCents: 12345, payments: [{ method: 'cash', amountCents: 12345 }] })
    const res = await request('GET', `/reports/sales.csv?from=${today}&to=${today}`, { cookie })
    expect(res.headers.get('content-type')).toContain('text/csv')
    const text = await res.response.text()
    expect(text).toContain('Período;Vendas;Subtotal;Descontos;Total')
    expect(text).toContain(`${today};1;123,45;0,00;123,45`)
  })
})

test('Início: avisos e resumo de hoje', async () => {
  const product = await createProduct(userId, { name: 'Blusa', basePriceCents: 1000, variants: [['Preta', 'M', 1]] })
  await createConfirmedSale(userId, {
    items: [[product.variants[0]!.id, 1]],
    payments: [{ method: 'pix', amountCents: 1000 }],
    shipping: true,
  })
  await services.saleDrafts.create(userId)
  const res = await request('GET', '/dashboard', { cookie })
  expect(res.body).toMatchObject({
    today,
    alerts: { outOfStock: 1, drafts: 1, shippingPending: 1, refundsPending: 0 },
    todaySummary: { salesCount: 1, salesTotalCents: 1000, receivedCents: 1000 },
    fiscalRulesValidated: false,
  })
  // 14 dias até hoje, com zero nos dias sem venda
  expect(res.body.last14Days).toHaveLength(14)
  expect(res.body.last14Days.at(-1)).toEqual({ date: today, count: 1, totalCents: 1000 })
  expect(res.body.last14Days[0].totalCents).toBe(0)
})

describe('RN-REL-07 posição do estoque', () => {
  test('saldo, valor a custo e a preço, peça sem custo à parte, filtros e CSV', async () => {
    const body = await createProduct(userId, {
      name: 'Body Renda',
      basePriceCents: 8990,
      variants: [
        ['Preta', 'M', 3],
        ['Vermelha', 'G', 0],
      ],
    })
    await createProduct(userId, { name: 'Calcinha Fio', basePriceCents: 2990, variants: [['Branca', 'P', 5]] })
    await db.update(products).set({ costCents: 4000, category: 'Bodies' }).where(eq(products.id, body.id))

    const all = await request('GET', '/reports/stock', { cookie })
    expect(all.status).toBe(200)
    expect(all.body.totals).toMatchObject({
      products: 2,
      variants: 3,
      pieces: 8,
      costCents: 3 * 4000,
      valueCents: 3 * 8990 + 5 * 2990,
      piecesWithoutCost: 5,
      marginCents: 3 * (8990 - 4000),
    })
    expect(all.body.byCategory[0]).toMatchObject({ category: 'Sem categoria', pieces: 5 })
    const preta = all.body.rows.find((r: { color: string }) => r.color === 'Preta')
    expect(preta).toMatchObject({
      stockQty: 3,
      costCents: 4000,
      stockCostCents: 12000,
      lastEntry: today,
      lastSale: null,
    })

    const out = await request('GET', '/reports/stock?status=out', { cookie })
    expect(out.body.rows.map((r: { color: string }) => r.color)).toEqual(['Vermelha'])
    const search = await request('GET', '/reports/stock?q=calcinha', { cookie })
    expect(search.body.totals.pieces).toBe(5)
    const category = await request('GET', '/reports/stock?category=Bodies', { cookie })
    expect(category.body.totals.variants).toBe(2)

    const csv = await request('GET', '/reports/stock.csv', { cookie })
    const text = await csv.response.text()
    expect(text).toContain('Produto;Referência;Categoria')
    expect(text).toContain('Body Renda')
  })
})

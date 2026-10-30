import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { auditLog, stockMovements } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string

beforeEach(async () => {
  await resetDatabase()
  ;({
    cookie,
    user: { id: userId },
  } = await loggedIn())
})

const key = () => crypto.randomUUID()
const post = (path: string, body: unknown, idempotencyKey: string | null = key()) =>
  request('POST', path, { cookie, body, headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {} })

async function oneVariant(initialQty = 3, name = 'Blusa básica') {
  const product = await createProduct(userId, { name, variants: [['Preta', 'M', initialQty]] })
  return product.variants[0]!.id
}

describe('RN-EST-03 entrada de mercadoria', () => {
  test('soma ao estoque com movimento purchase_entry na data da entrada', async () => {
    const variantId = await oneVariant(3)
    const res = await post('/stock/entries', {
      entryDate: '2026-10-01',
      supplierName: ' Fornecedor X ',
      items: [{ variantId, quantity: 4, unitCostCents: 2000 }],
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ supplierName: 'Fornecedor X', alreadyProcessed: false })
    expect(res.body.items[0]).toMatchObject({ productName: 'Blusa básica', color: 'Preta', size: 'M', quantity: 4 })

    const [movement] = await db.select().from(stockMovements).where(eq(stockMovements.type, 'purchase_entry'))
    expect(movement).toMatchObject({
      quantityDelta: 4,
      balanceAfter: 7,
      businessDate: '2026-10-01',
      refId: res.body.id,
    })
  })

  test('reenviar com a mesma Idempotency-Key não soma de novo', async () => {
    const variantId = await oneVariant(0)
    const body = { entryDate: '2026-10-01', items: [{ variantId, quantity: 2 }] }
    const idempotencyKey = key()
    await post('/stock/entries', body, idempotencyKey)
    const again = await post('/stock/entries', body, idempotencyKey)
    expect(again.status).toBe(200)
    expect(again.body.alreadyProcessed).toBe(true)
    expect((await services.products.searchVariants('blusa'))[0]!.stockQty).toBe(2)
  })

  test('data futura é recusada', async () => {
    const variantId = await oneVariant()
    const res = await post('/stock/entries', { entryDate: '2999-01-01', items: [{ variantId, quantity: 1 }] })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('A data da entrada não pode ser no futuro.')
  })

  test('sem Idempotency-Key é recusada', async () => {
    const variantId = await oneVariant()
    const res = await post('/stock/entries', { entryDate: '2026-10-01', items: [{ variantId, quantity: 1 }] }, null)
    expect(res.status).toBe(400)
  })

  test('quantidade zero é recusada', async () => {
    const variantId = await oneVariant()
    const res = await post('/stock/entries', { entryDate: '2026-10-01', items: [{ variantId, quantity: 0 }] })
    expect(res.status).toBe(400)
  })

  test('lista com total de peças', async () => {
    const variantId = await oneVariant()
    await post('/stock/entries', {
      entryDate: '2026-10-01',
      items: [
        { variantId, quantity: 2 },
        { variantId, quantity: 3 },
      ],
    })
    const res = await request('GET', '/stock/entries', { cookie })
    expect(res.body.items[0]).toMatchObject({ itemCount: 2, units: 5 })
  })
})

describe('acertos', () => {
  test('A7 / RN-EST-05 acerto por contagem define o saldo, não soma (3 → contou 5 → saldo 5, +2)', async () => {
    const variantId = await oneVariant(3)
    const res = await post('/stock/adjustments', { variantId, reason: 'count', countedQty: 5 })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ changed: true, movement: { quantityDelta: 2, balanceAfter: 5, countedQty: 5 } })
  })

  test('RN-EST-05 contagem igual ao saldo não grava nada', async () => {
    const variantId = await oneVariant(3)
    const res = await post('/stock/adjustments', { variantId, reason: 'count', countedQty: 3 })
    expect(res.body).toMatchObject({ changed: false, message: 'O saldo já está correto.' })
    expect(await db.select().from(stockMovements)).toHaveLength(1)
  })

  test('RN-EST-06 perda tira do saldo, com motivo e auditoria', async () => {
    const variantId = await oneVariant(3)
    const res = await post('/stock/adjustments', { variantId, reason: 'loss', quantityDelta: -1, note: 'Sumiu' })
    expect(res.body.movement).toMatchObject({ quantityDelta: -1, balanceAfter: 2, adjustmentReason: 'loss' })
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, 'stock_adjustment'))
    expect(entry).toMatchObject({ entityId: variantId, reason: 'Sumiu' })
  })

  test('RN-EST-06 motivo “outro” exige observação', async () => {
    const variantId = await oneVariant(3)
    const res = await post('/stock/adjustments', { variantId, reason: 'other', quantityDelta: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('Descreva o motivo na observação.')
  })

  test('RN-EST-07 acerto não deixa o saldo negativo', async () => {
    const variantId = await oneVariant(1)
    const res = await post('/stock/adjustments', { variantId, reason: 'damage', quantityDelta: -2 })
    expect(res.status).toBe(422)
    expect(res.body.error).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      message: 'Só há 1 unidade de Blusa básica Preta/M.',
    })
  })

  test('reenviar o mesmo acerto não aplica duas vezes', async () => {
    const variantId = await oneVariant(3)
    const idempotencyKey = key()
    await post('/stock/adjustments', { variantId, reason: 'error', quantityDelta: -1 }, idempotencyKey)
    const again = await post('/stock/adjustments', { variantId, reason: 'error', quantityDelta: -1 }, idempotencyKey)
    expect(again.body).toMatchObject({ alreadyProcessed: true, movement: { balanceAfter: 2 } })
  })
})

describe('RN-EST-10 histórico e RN-EST-08 alertas', () => {
  test('histórico por variação, do mais recente para o mais antigo, com referência', async () => {
    const variantId = await oneVariant(3)
    const entry = await post('/stock/entries', { entryDate: '2026-10-01', items: [{ variantId, quantity: 2 }] })
    await post('/stock/adjustments', { variantId, reason: 'count', countedQty: 4 })

    const res = await request('GET', `/variants/${variantId}/movements`, { cookie })
    expect(res.body.total).toBe(3)
    expect(res.body.items.map((m: { type: string; balanceAfter: number }) => [m.type, m.balanceAfter])).toEqual([
      ['adjustment', 4],
      ['purchase_entry', 5],
      ['initial', 3],
    ])
    expect(res.body.items[1]).toMatchObject({
      refType: 'stock_entry',
      refId: entry.body.id,
      productName: 'Blusa básica',
    })
  })

  test('histórico geral filtra por tipo', async () => {
    await oneVariant(3)
    const res = await request('GET', '/stock/movements?type=initial', { cookie })
    expect(res.body.items).toHaveLength(1)
  })

  test('alertas: sem estoque e repor, só variações ativas', async () => {
    await services.products.create(
      {
        name: 'Saia',
        basePriceCents: 1000,
        variants: [
          { color: 'Rosa', size: 'P', initialQty: 0 },
          { color: 'Rosa', size: 'M', initialQty: 2, minStock: 2 },
          { color: 'Rosa', size: 'G', initialQty: 5, minStock: 2 },
        ],
      },
      userId,
    )
    const res = await request('GET', '/stock/alerts', { cookie })
    expect(res.body).toMatchObject({ outCount: 1, lowCount: 1 })
    expect(res.body.low[0]).toMatchObject({ size: 'M', stockQty: 2 })
  })
})

test('integridade: saldo = soma dos movimentos', async () => {
  const variantId = await oneVariant(3)
  await post('/stock/entries', { entryDate: '2026-10-01', items: [{ variantId, quantity: 2 }] })
  await post('/stock/adjustments', { variantId, reason: 'loss', quantityDelta: -4 })
  const checks = await services.integrity.run()
  expect(checks.every((check) => check.ok)).toBe(true)
})

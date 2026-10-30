import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { payments, refunds, returns } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createConfirmedSale, createCustomer, createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string
let m: string
let g: string
let vestido: string

beforeEach(async () => {
  await resetDatabase()
  ;({
    cookie,
    user: { id: userId },
  } = await loggedIn())
  const blusa = await createProduct(userId, {
    name: 'Blusa',
    basePriceCents: 10000,
    variants: [
      ['Preta', 'M', 5],
      ['Preta', 'G', 5],
    ],
  })
  m = blusa.variants.find((v) => v.size === 'M')!.id
  g = blusa.variants.find((v) => v.size === 'G')!.id
  const outro = await createProduct(userId, { name: 'Vestido', basePriceCents: 13000, variants: [['Azul', 'U', 5]] })
  vestido = outro.variants[0]!.id
})

const stockOf = async (variantId: string) =>
  (await services.products.searchVariants('a')).find((v) => v.id === variantId)!.stockQty

const itemId = (sale: { items: { id?: string; variantId: string }[] }, variantId: string) =>
  sale.items.find((i) => i.variantId === variantId)!.id!

const returnRequest = (saleId: string, body: unknown, key: string = crypto.randomUUID()) =>
  request('POST', `/sales/${saleId}/returns`, { cookie, body, headers: { 'idempotency-key': key } })

const cash = (amountCents: number) => ({ id: crypto.randomUUID(), method: 'cash', amountCents, confirmed: true })

describe('troca', () => {
  test('A8 troca de tamanho: M volta (apta), G sai, venda nova paga com crédito, nada no caixa', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 1]],
      payments: [{ method: 'pix', amountCents: 10000 }],
    })
    const res = await returnRequest(sale.id, {
      items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }],
      exchange: { items: [{ variantId: g, quantity: 1 }], payments: [] },
    })
    expect(res.status).toBe(201)
    expect(await stockOf(m)).toBe(5)
    expect(await stockOf(g)).toBe(4)

    const exchangeSale = res.body.exchangeSale
    expect(exchangeSale).toMatchObject({ status: 'confirmed', totalCents: 10000, paymentStatus: 'paid' })
    expect(exchangeSale.payments).toMatchObject([{ method: 'exchange_credit', amountCents: 10000 }])
    expect(await db.select().from(refunds)).toHaveLength(0)
    expect(res.body.sale.returns[0]).toMatchObject({ type: 'exchange', exchangeCreditCents: 10000, refundCents: 0 })
    expect(res.body.sale.timeline.map((e: { type: string }) => e.type)).toContain('return_exchange')
  })

  test('A9 troca por peça mais cara: R$ 100 de crédito + R$ 30 pagos', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 1]],
      payments: [{ method: 'pix', amountCents: 10000 }],
    })
    const body = {
      items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }],
      exchange: { items: [{ variantId: vestido, quantity: 1 }], payments: [cash(3000)] },
    }
    const preview = await request('POST', `/sales/${sale.id}/returns/preview`, { cookie, body })
    expect(preview.body).toMatchObject({
      exchangeCreditCents: 10000,
      refundCents: 0,
      newSale: { totalCents: 13000, toPayCents: 3000, blockers: [] },
    })

    const res = await returnRequest(sale.id, body)
    const methods = res.body.exchangeSale.payments.map((p: { method: string; amountCents: number }) => [
      p.method,
      p.amountCents,
    ])
    expect(methods.sort()).toEqual([
      ['cash', 3000],
      ['exchange_credit', 10000],
    ])
  })

  test('troca sem pagar a diferença não é feita (nada é gravado)', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 1]],
      payments: [{ method: 'pix', amountCents: 10000 }],
    })
    const res = await returnRequest(sale.id, {
      items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }],
      exchange: { items: [{ variantId: vestido, quantity: 1 }], payments: [] },
    })
    expect(res.status).toBe(422)
    expect(res.body.error.message).toBe('Faltam R$ 30,00 para fechar o pagamento.')
    expect(await db.select().from(returns)).toHaveLength(0)
    expect(await stockOf(vestido)).toBe(5)
  })

  test('troca por peça mais barata: sobra vira devolução de valor', async () => {
    const barata = await createProduct(userId, { name: 'Meia', basePriceCents: 7000, variants: [['Branca', 'U', 3]] })
    const sale = await createConfirmedSale(userId, {
      items: [[m, 1]],
      payments: [{ method: 'pix', amountCents: 10000 }],
    })
    const res = await returnRequest(sale.id, {
      items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }],
      exchange: { items: [{ variantId: barata.variants[0]!.id, quantity: 1 }], payments: [] },
    })
    expect(res.body.sale.returns[0]).toMatchObject({ exchangeCreditCents: 7000, refundCents: 3000 })
    expect(res.body.sale.refunds).toMatchObject([{ amountCents: 3000, status: 'pending', source: 'return' }])
  })

  test('RN-DEV-05 dívida da venda original continua nela; crédito é usado primeiro na troca', async () => {
    const maria = await createCustomer()
    const sale = await createConfirmedSale(userId, { items: [[m, 2]], customerId: maria.id, fiado: true })
    const res = await returnRequest(sale.id, {
      items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }],
      exchange: { items: [{ variantId: g, quantity: 1 }], payments: [] },
    })
    expect(res.body.sale.receivable).toMatchObject({ balanceCents: 20000, status: 'open' })
    expect(res.body.exchangeSale).toMatchObject({ paymentStatus: 'paid', customerId: maria.id })
  })
})

describe('devolução parcial', () => {
  test('aceite: devolver 1 de 3 peças com desconto e depois as outras 2 soma exatamente o total da linha', async () => {
    const draft = await services.saleDrafts.create(userId)
    await services.saleDrafts.update(draft.id, {
      version: draft.version,
      items: [{ variantId: m, quantity: 3 }],
      discount: { kind: 'amount', value: 1 },
      payments: [{ id: crypto.randomUUID(), method: 'cash', amountCents: 29999, confirmed: true }],
    })
    const sale = await services.saleConfirmation.confirm(draft.id, userId)
    const saleItemId = itemId(sale, m)

    const first = await returnRequest(sale.id, {
      items: [{ saleItemId, quantity: 1, received: true, condition: 'sellable' }],
    })
    const second = await returnRequest(sale.id, {
      items: [{ saleItemId, quantity: 2, received: true, condition: 'sellable' }],
    })
    const values = [first, second].map((r) => r.body.sale.returns.at(-1).itemsValueCents)
    expect(values).toEqual([10000, 19999])
    expect(values[0] + values[1]).toBe(29999)
    expect(await stockOf(m)).toBe(5)
  })

  test('RN-DEV-04 em venda no fiado, o valor abate primeiro a dívida (sem devolução de dinheiro)', async () => {
    const maria = await createCustomer()
    const sale = await createConfirmedSale(userId, { items: [[m, 3]], customerId: maria.id, fiado: true })
    const res = await returnRequest(sale.id, {
      items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }],
    })
    expect(res.body.sale.receivable).toMatchObject({ balanceCents: 20000, adjustedCents: 10000 })
    expect(res.body.sale.refunds).toEqual([])
  })

  test('peça ainda com a cliente fica aguardando e não volta ao estoque', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 2]],
      payments: [{ method: 'pix', amountCents: 20000 }],
    })
    await returnRequest(sale.id, { items: [{ saleItemId: itemId(sale, m), quantity: 1, received: false }] })
    expect(await stockOf(m)).toBe(3)
    expect((await request('GET', '/returns', { cookie })).body[0]).toMatchObject({ type: 'partial_return' })
  })

  test('RN-DEV-01 não deixa devolver mais do que ainda pode (inclui as que aguardam retorno)', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 2]],
      payments: [{ method: 'pix', amountCents: 20000 }],
    })
    const saleItemId = itemId(sale, m)
    await returnRequest(sale.id, { items: [{ saleItemId, quantity: 1, received: false }] })
    const res = await returnRequest(sale.id, { items: [{ saleItemId, quantity: 2, received: false }] })
    expect(res.status).toBe(422)
    expect(res.body.error.message).toBe('Só 1 peça de Blusa Preta / M ainda pode ser devolvida.')
  })

  test('peça recebida exige condição', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 1]],
      payments: [{ method: 'pix', amountCents: 10000 }],
    })
    const res = await returnRequest(sale.id, { items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true }] })
    expect(res.status).toBe(400)
  })

  test('reenviar com a mesma chave não devolve duas vezes', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 2]],
      payments: [{ method: 'pix', amountCents: 20000 }],
    })
    const body = { items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }] }
    const key = crypto.randomUUID()
    await returnRequest(sale.id, body, key)
    const again = await returnRequest(sale.id, body, key)
    expect(again.body.alreadyProcessed).toBe(true)
    expect(await db.select().from(returns)).toHaveLength(1)
    expect(await stockOf(m)).toBe(4)
  })

  test('RN-CAN-08 com todas as peças devolvidas, cancelar é bloqueado', async () => {
    const sale = await createConfirmedSale(userId, {
      items: [[m, 1]],
      payments: [{ method: 'pix', amountCents: 10000 }],
    })
    await returnRequest(sale.id, {
      items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'sellable' }],
    })
    const res = await request('POST', `/sales/${sale.id}/cancel`, {
      cookie,
      body: { reason: 'x', itemsWithStore: true },
    })
    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('já foram devolvidas')
  })
})

test('invariantes depois de devoluções e trocas', async () => {
  const maria = await createCustomer()
  const sale = await createConfirmedSale(userId, { items: [[m, 3]], customerId: maria.id, fiado: true })
  await returnRequest(sale.id, {
    items: [{ saleItemId: itemId(sale, m), quantity: 1, received: true, condition: 'damaged' }],
    exchange: { items: [{ variantId: vestido, quantity: 1 }], payments: [cash(3000)] },
  })
  await returnRequest(sale.id, { items: [{ saleItemId: itemId(sale, m), quantity: 1, received: false }] })
  const credit = await db.select().from(payments).where(eq(payments.kind, 'exchange_credit'))
  expect(credit).toHaveLength(1)
  expect((await services.integrity.run()).filter((c) => !c.ok)).toEqual([])
})

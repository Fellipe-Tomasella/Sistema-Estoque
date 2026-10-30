import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { payments, refunds, stockMovements } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createConfirmedSale, createCustomer, createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string
let variantId: string

beforeEach(async () => {
  await resetDatabase()
  ;({
    cookie,
    user: { id: userId },
  } = await loggedIn())
  const product = await createProduct(userId, { name: 'Blusa', basePriceCents: 15000, variants: [['Preta', 'M', 5]] })
  variantId = product.variants[0]!.id
})

const stock = async () => (await services.products.searchVariants('blusa'))[0]!.stockQty

async function sale(options: Parameters<typeof createConfirmedSale>[1] = {}) {
  return createConfirmedSale(userId, {
    items: [[variantId, 1]],
    payments: [{ method: 'pix', amountCents: 15000 }],
    ...options,
  })
}

const cancel = (saleId: string, itemsWithStore: boolean, reason = 'Cliente desistiu') =>
  request('POST', `/sales/${saleId}/cancel`, { cookie, body: { reason, itemsWithStore } })

describe('cancelamento', () => {
  test('A3 peça com a loja volta ao estoque uma única vez; repetir não muda nada', async () => {
    const confirmed = await sale({ shipping: true })
    expect(await stock()).toBe(4)

    const preview = await request('GET', `/sales/${confirmed.id}/cancel-preview`, { cookie })
    expect(preview.body).toMatchObject({ itemsWithStoreDefault: true, piecesBackToStock: 1, refundCents: 15000 })

    const res = await cancel(confirmed.id, true)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'cancelled',
      alreadyProcessed: false,
      cancellation: { reason: 'Cliente desistiu' },
    })
    expect(await stock()).toBe(5)

    const again = await cancel(confirmed.id, true)
    expect(again.body.alreadyProcessed).toBe(true)
    expect(await stock()).toBe(5)
    expect(await db.select().from(stockMovements).where(eq(stockMovements.type, 'sale_cancel_return'))).toHaveLength(1)
  })

  test('RN-CAN-07 dois cancelamentos ao mesmo tempo: um efeito só', async () => {
    const confirmed = await sale()
    const results = await Promise.all([cancel(confirmed.id, true), cancel(confirmed.id, true)])
    expect(results.map((r) => r.body.alreadyProcessed).sort()).toEqual([false, true])
    expect(await stock()).toBe(5)
    expect(await db.select().from(refunds)).toHaveLength(1)
  })

  test('RN-CAN-05 venda R$ 150 no fiado, pagou R$ 50 → dívida de R$ 100 cancelada e R$ 50 a devolver', async () => {
    const maria = await createCustomer()
    const confirmed = await sale({ customerId: maria.id, payments: [], fiado: true })
    await services.receivableReceipts.create(
      crypto.randomUUID(),
      {
        customerId: maria.id,
        method: 'cash',
        amountCents: 5000,
        allocations: [{ receivableId: confirmed.receivable!.id, amountCents: 5000 }],
      },
      userId,
    )

    const preview = await request('GET', `/sales/${confirmed.id}/cancel-preview?itemsWithStore=true`, { cookie })
    expect(preview.body).toMatchObject({ itemsValueCents: 15000, receivableCancelledCents: 10000, refundCents: 5000 })
    expect(preview.body.messages).toEqual([
      '1 peça volta ao estoque.',
      'Fiado de R$ 100,00 cancelado.',
      'R$ 50,00 a devolver para a cliente.',
    ])

    const res = await cancel(confirmed.id, true)
    expect(res.body.receivable).toMatchObject({
      status: 'cancelled',
      balanceCents: 0,
      adjustedCents: 10000,
      paidCents: 5000,
    })
    expect(res.body.refunds).toMatchObject([{ amountCents: 5000, status: 'pending', source: 'cancellation' }])
    const debts = await services.receivables.byCustomer(maria.id)
    expect(debts.openBalanceCents).toBe(0)
  })

  test('RN-CAN-06 recebimentos já feitos não são apagados nem estornados', async () => {
    const confirmed = await sale()
    await cancel(confirmed.id, true)
    const [payment] = await db.select().from(payments)
    expect(payment).toMatchObject({ status: 'valid', amountCents: 15000 })
  })

  test('A4 peça com a cliente: estoque não muda até registrar o retorno; apta volta 1 unidade', async () => {
    const confirmed = await sale({ shipping: true })
    await request('PATCH', `/sales/${confirmed.id}/shipping`, { cookie, body: { status: 'shipped' } })
    await request('PATCH', `/sales/${confirmed.id}/shipping`, { cookie, body: { status: 'delivered' } })

    const preview = await request('GET', `/sales/${confirmed.id}/cancel-preview`, { cookie })
    expect(preview.body).toMatchObject({ itemsWithStoreDefault: false, piecesAwaitingReturn: 1 })

    const res = await cancel(confirmed.id, false)
    expect(await stock()).toBe(4)
    expect(res.body.returns[0]).toMatchObject({ type: 'cancellation', status: 'awaiting_items' })

    const pending = await request('GET', '/returns', { cookie })
    expect(pending.body).toHaveLength(1)
    const ret = pending.body[0]
    expect(ret).toMatchObject({ saleNumber: 1, items: [{ status: 'awaiting', quantity: 1, productName: 'Blusa' }] })

    const received = await request('POST', `/returns/${ret.id}/items/${ret.items[0].id}/receive`, {
      cookie,
      body: { condition: 'sellable' },
    })
    expect(received.body).toMatchObject({ status: 'completed', items: [{ status: 'received', condition: 'sellable' }] })
    expect(await stock()).toBe(5)

    await request('POST', `/returns/${ret.id}/items/${ret.items[0].id}/receive`, {
      cookie,
      body: { condition: 'sellable' },
    })
    expect(await stock()).toBe(5)
    expect((await request('GET', '/returns', { cookie })).body).toHaveLength(0)
  })

  test('RN-DEV-07 peça avariada não volta ao estoque, mas fica registrada', async () => {
    const confirmed = await sale()
    const res = await cancel(confirmed.id, false)
    const ret = res.body.returns[0]
    await request('POST', `/returns/${ret.id}/items/${ret.items[0].id}/receive`, {
      cookie,
      body: { condition: 'damaged' },
    })
    expect(await stock()).toBe(4)
    const view = await services.sales.view(confirmed.id)
    expect(view.returns[0]).toMatchObject({ status: 'completed' })
    expect(view.timeline.map((e) => e.description)).toContain('Peça recebida de volta: avariada')
  })

  test('RN-CAN-03 sem envio registrado, a dona precisa dizer onde estão as peças', async () => {
    const confirmed = await sale()
    const preview = await request('GET', `/sales/${confirmed.id}/cancel-preview`, { cookie })
    expect(preview.body).toMatchObject({ itemsWithStoreDefault: null, needsItemsLocation: true })
  })

  test('RN-CAN-01 motivo é obrigatório e só venda confirmada é cancelada', async () => {
    const confirmed = await sale()
    expect((await cancel(confirmed.id, true, '')).status).toBe(400)
    const draft = await services.saleDrafts.create(userId)
    expect((await cancel(draft.id, true)).status).toBe(422)
  })

  test('RN-CAN-09 venda cancelada continua no histórico e o comprovante mostra CANCELADA', async () => {
    const confirmed = await sale()
    await cancel(confirmed.id, true)
    const list = await request('GET', '/sales?status=cancelled', { cookie })
    expect(list.body.items[0]).toMatchObject({ id: confirmed.id, status: 'cancelled' })
    const text = JSON.stringify((await services.receipts.saleContent(confirmed.id)).content)
    expect(text).toContain('VENDA CANCELADA')
  })
})

describe('RN-DEV-08 devolução de valor', () => {
  test('pendente até registrar “devolvido” com forma e data; depois pode ser anulada', async () => {
    const confirmed = await sale()
    await cancel(confirmed.id, true)
    const pending = await request('GET', '/refunds?status=pending', { cookie })
    expect(pending.body).toMatchObject([{ amountCents: 15000, saleNumber: 1 }])

    const done = await request('POST', `/refunds/${pending.body[0].id}/done`, {
      cookie,
      body: { method: 'pix', date: '2026-10-29' },
    })
    expect(done.body).toMatchObject({ status: 'done', method: 'pix', businessDate: '2026-10-29' })

    const again = await request('POST', `/refunds/${pending.body[0].id}/done`, { cookie, body: { method: 'cash' } })
    expect(again.body.method).toBe('pix')

    const cancelled = await request('POST', `/refunds/${pending.body[0].id}/cancel`, {
      cookie,
      body: { reason: 'Lancei errado' },
    })
    expect(cancelled.body).toMatchObject({ status: 'cancelled', cancelReason: 'Lancei errado' })
  })
})

test('invariantes continuam válidas depois de cancelar e receber peças', async () => {
  const maria = await createCustomer()
  const a = await sale({ customerId: maria.id, payments: [], fiado: true })
  const b = await sale()
  await cancel(a.id, false)
  await cancel(b.id, true)
  const ret = (await services.sales.view(a.id)).returns[0]!
  await services.returns.receiveItem(ret.id, ret.items[0]!.id, 'sellable', userId)
  expect((await services.integrity.run()).filter((c) => !c.ok)).toEqual([])
})

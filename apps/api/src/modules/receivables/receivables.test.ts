import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '../../db/client'
import { sales, stockMovements } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createConfirmedSale, createCustomer, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string
let maria: { id: string }

beforeEach(async () => {
  await resetDatabase()
  ;({
    cookie,
    user: { id: userId },
  } = await loggedIn())
  maria = await createCustomer('Maria', { phone: '65 99999-0001' })
})

const fiadoSale = (totalCents: number, extra: Record<string, unknown> = {}) =>
  createConfirmedSale(userId, { totalCents, customerId: maria.id, fiado: true, ...extra })

const receive = (body: Record<string, unknown>, key: string = crypto.randomUUID()) =>
  request('POST', '/receipts', {
    cookie,
    body: { customerId: maria.id, method: 'pix', ...body },
    headers: { 'idempotency-key': key },
  })

const allocate = (receivableId: string, amountCents: number) => ({
  amountCents,
  allocations: [{ receivableId, amountCents }],
})

const debts = async () => (await request('GET', `/customers/${maria.id}/receivables`, { cookie })).body

describe('fiado', () => {
  test('A2 fiado parcial: venda R$ 150, recebe R$ 50 → saldo R$ 100, sem venda nova nem estoque', async () => {
    const sale = await fiadoSale(15000)
    const movementsBefore = (await db.select().from(stockMovements)).length

    const res = await receive(allocate(sale.receivable!.id, 5000))
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      amountCents: 5000,
      openBalanceCents: 10000,
      allocations: [{ balanceCents: 10000 }],
    })

    expect(await db.select().from(sales)).toHaveLength(1)
    expect(await db.select().from(stockMovements)).toHaveLength(movementsBefore)
    const view = await services.sales.view(sale.id)
    expect(view).toMatchObject({
      paymentStatus: 'partially_paid',
      receivable: { balanceCents: 10000, paidCents: 5000 },
    })
  })

  test('RN-FIA-02 dívidas por cliente com recebimentos e saldo', async () => {
    const sale = await fiadoSale(15000)
    await receive(allocate(sale.receivable!.id, 5000))
    const body = await debts()
    expect(body).toMatchObject({ openBalanceCents: 10000, overdue: false })
    expect(body.receivables[0]).toMatchObject({
      description: 'Venda #000001',
      originalCents: 15000,
      balanceCents: 10000,
      receipts: [{ amountCents: 5000, method: 'pix', status: 'valid' }],
    })
  })

  test('RN-FIA-03 “em atraso” só com data combinada vencida', async () => {
    await fiadoSale(1000, { fiadoDueDate: '2020-01-01' })
    await fiadoSale(1000)
    const body = await debts()
    expect(body.overdue).toBe(true)
    expect(body.receivables.map((r: { overdue: boolean }) => r.overdue)).toEqual([true, false])

    const list = await request('GET', '/customers?withOpenBalance=true', { cookie })
    expect(list.body.items[0]).toMatchObject({ openBalanceCents: 2000, overdue: true })
  })

  test('RN-FIA-04 prévia sugere das mais antigas para as mais novas', async () => {
    const first = await fiadoSale(3000)
    const second = await fiadoSale(4000)
    const res = await request('POST', '/receipts/preview', {
      cookie,
      body: { customerId: maria.id, amountCents: 5000 },
    })
    expect(res.body.allocations).toEqual([
      { receivableId: first.receivable!.id, amountCents: 3000 },
      { receivableId: second.receivable!.id, amountCents: 2000 },
    ])
    expect(res.body.message).toBe('Saldo de Maria passa de R$ 70,00 para R$ 20,00.')
  })

  test('RN-FIA-05 valor acima do total em aberto é bloqueado', async () => {
    const sale = await fiadoSale(3000)
    const res = await receive(allocate(sale.receivable!.id, 3500))
    expect(res.status).toBe(422)
    expect(res.body.error.message).toBe(
      'O valor passa do total em aberto (R$ 30,00). Crédito para compras futuras não está disponível.',
    )
  })

  test('RN-FIA-05 soma distribuída precisa bater com o valor recebido', async () => {
    const sale = await fiadoSale(3000)
    const res = await receive({
      amountCents: 2000,
      allocations: [{ receivableId: sale.receivable!.id, amountCents: 1000 }],
    })
    expect(res.status).toBe(400)
  })

  test('RN-FIA-06 dívida quitada continua no histórico e a venda fica paga', async () => {
    const sale = await fiadoSale(3000)
    await receive(allocate(sale.receivable!.id, 3000))
    const body = await debts()
    expect(body.openBalanceCents).toBe(0)
    expect(body.receivables[0]).toMatchObject({ status: 'settled', balanceCents: 0 })
    expect((await services.sales.view(sale.id)).paymentStatus).toBe('paid')
    expect((await request('GET', '/customers?withOpenBalance=true', { cookie })).body.total).toBe(0)
  })

  test('RN-FIA-07 estorno reabre o saldo e a dívida, com motivo', async () => {
    const sale = await fiadoSale(3000)
    const receipt = await receive(allocate(sale.receivable!.id, 3000))
    const voided = await request('POST', `/receipts/${receipt.body.id}/void`, {
      cookie,
      body: { reason: 'Lancei errado' },
    })
    expect(voided.body).toMatchObject({ status: 'voided', voidReason: 'Lancei errado', openBalanceCents: 3000 })

    const body = await debts()
    expect(body.receivables[0]).toMatchObject({ status: 'open', balanceCents: 3000, settledAt: null })
    expect((await services.sales.view(sale.id)).paymentStatus).toBe('unpaid')

    // estornar de novo não muda nada
    await request('POST', `/receipts/${receipt.body.id}/void`, { cookie, body: { reason: 'de novo' } })
    expect((await debts()).openBalanceCents).toBe(3000)
  })

  test('RN-FIA-09 reenviar o mesmo recebimento devolve o mesmo registro', async () => {
    const sale = await fiadoSale(3000)
    const key = crypto.randomUUID()
    await receive(allocate(sale.receivable!.id, 1000), key)
    const again = await receive(allocate(sale.receivable!.id, 1000), key)
    expect(again.status).toBe(200)
    expect(again.body.alreadyProcessed).toBe(true)
    expect((await debts()).openBalanceCents).toBe(2000)
  })

  test('data futura é recusada', async () => {
    const sale = await fiadoSale(3000)
    const res = await receive({ date: '2999-01-01', ...allocate(sale.receivable!.id, 1000) })
    expect(res.status).toBe(400)
  })

  test('alterar data combinada', async () => {
    const sale = await fiadoSale(3000)
    const res = await request('PATCH', `/receivables/${sale.receivable!.id}`, {
      cookie,
      body: { dueDate: '2026-12-15' },
    })
    expect(res.body.dueDate).toBe('2026-12-15')
  })

  test('RN-FIA-08 comprovante de recebimento', async () => {
    const sale = await fiadoSale(15000)
    const receipt = await receive(allocate(sale.receivable!.id, 5000))
    const pdf = await request('GET', `/receipts/${receipt.body.id}/receipt.pdf`, { cookie })
    expect(pdf.headers.get('content-type')).toBe('application/pdf')
    const text = JSON.stringify((await services.receipts.receivableReceiptContent(receipt.body.id)).content)
    expect(text).toContain('Maria')
    expect(text).toContain('Venda #000001')
    expect(text).toContain('R$ 100,00')
    expect(text).toContain('não é documento fiscal')
  })

  test('invariantes 2 e 6 continuam válidas depois de receber e estornar', async () => {
    const sale = await fiadoSale(3000)
    const receipt = await receive(allocate(sale.receivable!.id, 1000))
    await request('POST', `/receipts/${receipt.body.id}/void`, { cookie, body: { reason: 'x' } })
    await receive(allocate(sale.receivable!.id, 3000))
    const checks = await services.integrity.run()
    expect(checks.filter((c) => !c.ok)).toEqual([])
  })
})

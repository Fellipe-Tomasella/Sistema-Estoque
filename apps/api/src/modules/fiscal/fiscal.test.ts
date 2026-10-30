import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '../../db/client'
import { receivables, sales, stockMovements } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createConfirmedSale, createCustomer, loggedIn } from '../../../test/factories'
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

const ACCESS_KEY = '3526 1011 2223 3300 0181 5500 1000 0001 2310 0001 2345'

async function companySale() {
  const empresa = await createCustomer('Loja X', { document: '11.222.333/0001-81' })
  return createConfirmedSale(userId, {
    totalCents: 10000,
    customerId: empresa.id,
    payments: [{ method: 'pix', amountCents: 10000 }],
  })
}

const register = (saleId: string, body: Record<string, unknown> = {}) =>
  request('POST', `/sales/${saleId}/fiscal-documents`, {
    cookie,
    body: { docType: 'nfe', number: '123', series: '1', accessKey: ACCESS_KEY, issuedAt: '2026-10-30', ...body },
  })

const pending = async () => (await request('GET', '/fiscal/pending', { cookie })).body

describe('fiscal (registro manual)', () => {
  test('aceite: venda para CNPJ fica pendente até registrar a NF', async () => {
    const sale = await companySale()
    expect((await pending()).salesWithoutDocument).toMatchObject([
      { saleId: sale.id, requirement: 'required', numberLabel: '#000001', customerName: 'Loja X' },
    ])

    const res = await register(sale.id)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ status: 'registered', accessKey: ACCESS_KEY.replace(/\D/g, '') })
    expect((await pending()).salesWithoutDocument).toEqual([])

    const view = (await request('GET', `/sales/${sale.id}`, { cookie })).body
    expect(view.fiscalDocuments).toHaveLength(1)
    expect(view.timeline.map((e: { description: string }) => e.description)).toContain('Nota fiscal registrada: nº 123')
  })

  test('aceite: envio para outra UF aparece como “revisar”', async () => {
    await request('PUT', '/settings/store', { cookie, body: { uf: 'MT' } })
    const maria = await createCustomer('Maria', { address: { city: 'Recife', uf: 'PE' } })
    await createConfirmedSale(userId, {
      totalCents: 5000,
      customerId: maria.id,
      payments: [{ method: 'pix', amountCents: 5000 }],
      shipping: true,
    })
    expect((await pending()).salesWithoutDocument).toMatchObject([{ requirement: 'review' }])
  })

  test('chave de acesso precisa ter 44 dígitos', async () => {
    const sale = await companySale()
    const res = await register(sale.id, { accessKey: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('A chave de acesso precisa ter 44 dígitos.')
  })

  test('número da NF aparece no comprovante', async () => {
    const sale = await companySale()
    await register(sale.id)
    const text = JSON.stringify((await services.receipts.saleContent(sale.id)).content)
    expect(text).toContain('NF-e')
    expect(text).toContain('nº 123 série 1')
    expect(text).toContain('não é documento fiscal')
  })

  test('RN-FIS-08 registrar nota não cria venda, dívida nem movimento de estoque', async () => {
    const sale = await companySale()
    const before = [(await db.select().from(sales)).length, (await db.select().from(stockMovements)).length]
    await register(sale.id)
    expect([(await db.select().from(sales)).length, (await db.select().from(stockMovements)).length]).toEqual(before)
    expect(await db.select().from(receivables)).toHaveLength(0)
  })

  test('RN-CAN-10 cancelar venda com NF deixa a nota “cancelamento pendente” até a dona registrar', async () => {
    const sale = await companySale()
    const doc = (await register(sale.id)).body

    const preview = await request('GET', `/sales/${sale.id}/cancel-preview?itemsWithStore=true`, { cookie })
    expect(preview.body.fiscalAlert).toContain('cancele a nota no emissor')

    const cancelled = await request('POST', `/sales/${sale.id}/cancel`, {
      cookie,
      body: { reason: 'Desistiu', itemsWithStore: true },
    })
    expect(cancelled.body.effects.fiscalAlert).toContain('cancele a nota no emissor')
    expect(cancelled.body.fiscalDocuments[0].status).toBe('cancel_pending')

    const list = await pending()
    expect(list.cancelPending).toMatchObject([{ id: doc.id, message: 'Cancele a nota no emissor e registre aqui.' }])
    expect((await request('GET', '/dashboard', { cookie })).body.alerts.fiscalPending).toBe(1)

    const done = await request('PATCH', `/fiscal-documents/${doc.id}`, {
      cookie,
      body: { cancelled: true, cancelledAt: '2026-10-30' },
    })
    expect(done.body).toMatchObject({ status: 'cancelled', cancelledAt: '2026-10-30' })
    expect((await pending()).cancelPending).toEqual([])
  })

  test('RN-FIS-07 faixa de aviso até o contador validar as regras', async () => {
    expect((await pending()).banner).toBe('Regras fiscais aguardando validação do contador.')
    await request('PUT', '/settings/store', { cookie, body: { fiscalRulesValidated: true } })
    expect((await pending()).banner).toBeNull()
  })

  test('corrigir dados da nota fica auditado', async () => {
    const sale = await companySale()
    const doc = (await register(sale.id)).body
    const res = await request('PATCH', `/fiscal-documents/${doc.id}`, { cookie, body: { number: '124' } })
    expect(res.body).toMatchObject({ number: '124', status: 'registered' })
  })
})

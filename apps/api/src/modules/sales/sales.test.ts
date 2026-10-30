import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { payments, receivables, stockMovements } from '../../db/schema'
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

type Body = Record<string, unknown>

async function newDraft() {
  const res = await request('POST', '/sales', { cookie })
  return res.body as { id: string; version: number }
}

/** Edita o rascunho mandando a versão atual (como o front faz). */
async function edit(saleId: string, body: Body) {
  const current = await request('GET', `/sales/${saleId}`, { cookie })
  return request('PATCH', `/sales/${saleId}`, { cookie, body: { version: current.body.version, ...body } })
}

const confirm = (saleId: string) => request('POST', `/sales/${saleId}/confirm`, { cookie })
const cash = (amountCents: number) => ({ id: crypto.randomUUID(), method: 'cash', amountCents, confirmed: true })
const pix = (amountCents: number, confirmed = true) => ({
  id: crypto.randomUUID(),
  method: 'pix',
  amountCents,
  confirmed,
})
const card = (amountCents: number) => ({ id: crypto.randomUUID(), method: 'card', amountCents, confirmed: true })

async function blusa() {
  const product = await createProduct(userId, {
    name: 'Blusa básica',
    basePriceCents: 5000,
    variants: [
      ['Preta', 'M', 3],
      ['Preta', 'G', 2],
    ],
  })
  const variant = (size: string) => product.variants.find((v) => v.size === size)!.id
  return { product, m: variant('M'), g: variant('G') }
}

async function customer(body: Body = { name: 'Maria', phone: '65 99999-0001' }) {
  return (await request('POST', '/customers', { cookie, body })).body as { id: string }
}

async function stockOf(variantId: string) {
  const [row] = (await services.products.searchVariants('blusa')).filter((v) => v.id === variantId)
  return row!.stockQty
}

describe('rascunho', () => {
  test('RN-VEN-01 rascunho não mexe no estoque nem reserva', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    const res = await edit(sale.id, { items: [{ variantId: m, quantity: 2 }] })
    expect(res.body).toMatchObject({ status: 'draft', subtotalCents: 10000, totalCents: 10000, number: null })
    expect(await stockOf(m)).toBe(3)
    expect(await db.select().from(stockMovements).where(eq(stockMovements.type, 'sale'))).toHaveLength(0)
  })

  test('RN-VEN-02 mesma variação somada na mesma linha; aviso quando passa do saldo', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    const res = await edit(sale.id, {
      items: [
        { variantId: m, quantity: 2 },
        { variantId: m, quantity: 2 },
      ],
    })
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0]).toMatchObject({ quantity: 4, availableQty: 3 })
    expect(res.body.warnings).toEqual(['Só há 3 unidades de Blusa básica Preta/M (no carrinho: 4).'])
  })

  test('RN-VEN-04 trocar o desconto substitui o anterior, nunca soma', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 2 }], discount: { kind: 'amount', value: 1000 } })
    const res = await edit(sale.id, { discount: { kind: 'percent', value: 1000 } })
    expect(res.body).toMatchObject({
      discountCents: 1000,
      totalCents: 9000,
      discount: { kind: 'percent', value: 1000 },
    })
  })

  test('RN-PRO-06 rascunho acompanha o preço atual do cadastro', async () => {
    const { product, m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }] })
    await request('PATCH', `/products/${product.id}`, { cookie, body: { basePriceCents: 6000 } })
    expect((await request('GET', `/sales/${sale.id}`, { cookie })).body.totalCents).toBe(6000)
  })

  test('RN-VEN-10 versão desatualizada (outro aparelho) devolve 409', async () => {
    const sale = await newDraft()
    await request('PATCH', `/sales/${sale.id}`, { cookie, body: { version: sale.version, notes: 'notebook' } })
    const stale = await request('PATCH', `/sales/${sale.id}`, {
      cookie,
      body: { version: sale.version, notes: 'celular' },
    })
    expect(stale.status).toBe(409)
    expect(stale.body.error.message).toBe('Esta venda foi alterada em outro aparelho. Recarregue.')
  })

  test('RN-VEN-09 rascunho pode ser descartado; lista de rascunhos', async () => {
    const a = await newDraft()
    await newDraft()
    expect((await request('GET', '/sales/drafts', { cookie })).body).toHaveLength(2)
    await request('DELETE', `/sales/${a.id}`, { cookie })
    expect((await request('GET', '/sales/drafts', { cookie })).body).toHaveLength(1)
  })

  test('RN-VEN-06 confirmar com pendência mostra o motivo e continua rascunho', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [pix(5000, false)] })
    const res = await confirm(sale.id)
    expect(res.status).toBe(422)
    expect(res.body.error.message).toBe('Confirme que o Pix foi recebido.')
    expect((await request('GET', `/sales/${sale.id}`, { cookie })).body.status).toBe('draft')
  })
})

describe('confirmação', () => {
  test('A1 venda por variação: vende 1 Preta M, Preta G não muda', async () => {
    const { m, g } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [cash(5000)] })
    const res = await confirm(sale.id)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'confirmed',
      numberLabel: '#000001',
      paymentStatus: 'paid',
      alreadyProcessed: false,
    })
    expect(await stockOf(m)).toBe(2)
    expect(await stockOf(g)).toBe(2)
  })

  test('RN-VEN-07 congela nome e preço e rateia o desconto entre os itens', async () => {
    const { product, m, g } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, {
      items: [
        { variantId: m, quantity: 1 },
        { variantId: g, quantity: 2 },
      ],
      discount: { kind: 'amount', value: 1000 },
      payments: [cash(14000)],
    })
    await confirm(sale.id)
    await request('PATCH', `/products/${product.id}`, { cookie, body: { name: 'Blusa nova', basePriceCents: 9900 } })

    const view = (await request('GET', `/sales/${sale.id}`, { cookie })).body
    expect(
      view.items.map((i: Body) => [i.productName, i.unitPriceCents, i.discountAllocatedCents, i.lineTotalCents]),
    ).toEqual([
      ['Blusa básica', 5000, 333, 4667],
      ['Blusa básica', 5000, 667, 9333],
    ])
    expect(view.totalCents).toBe(14000)
  })

  test('A6 / RN-VEN-08 confirmar duas vezes: 1 venda, 1 baixa, 1 pagamento', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [cash(5000)] })
    const [first, second] = await Promise.all([confirm(sale.id), confirm(sale.id)])

    expect([first.body.alreadyProcessed, second.body.alreadyProcessed].sort()).toEqual([false, true])
    expect(first.body.number).toBe(second.body.number)
    expect(await stockOf(m)).toBe(2)
    expect(await db.select().from(payments)).toHaveLength(1)
    expect(await db.select().from(stockMovements).where(eq(stockMovements.type, 'sale'))).toHaveLength(1)
  })

  test('A10 concorrência na última unidade: 1 sucesso, 1 erro de estoque', async () => {
    const product = await createProduct(userId, { name: 'Saia', variants: [['Rosa', 'P', 1]] })
    const variantId = product.variants[0]!.id
    const a = await newDraft()
    const b = await newDraft()
    for (const sale of [a, b]) await edit(sale.id, { items: [{ variantId, quantity: 1 }], payments: [cash(5000)] })

    const results = await Promise.all([confirm(a.id), confirm(b.id)])
    expect(results.map((r) => r.status).sort()).toEqual([200, 422])
    const failed = results.find((r) => r.status === 422)!
    expect(failed.body.error).toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      message: 'Não foi possível confirmar: só há 0 unidades de Saia Rosa/P (no carrinho: 1).',
    })
    expect(await services.integrity.run()).toSatisfy((checks) => checks.every((c) => c.ok))
  })

  test('variação inativada depois de ir para o carrinho bloqueia a confirmação', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [cash(5000)] })
    await request('PATCH', `/variants/${m}`, { cookie, body: { active: false } })
    const res = await confirm(sale.id)
    expect(res.status).toBe(422)
    expect(res.body.error.message).toBe('Blusa básica Preta/M não está mais à venda.')
  })

  test('RN-PAG-02 / A5 Pix + cartão aprovados na maquininha', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 2 }], payments: [pix(4000), card(6000)] })
    const res = await confirm(sale.id)
    expect(res.body.payments.map((p: Body) => [p.method, p.amountCents]).sort()).toEqual([
      ['card', 6000],
      ['pix', 4000],
    ])
  })

  test('RN-PAG-03 entrada + resto no fiado cria a dívida certa', async () => {
    const { m } = await blusa()
    const maria = await customer()
    const sale = await newDraft()
    await edit(sale.id, {
      items: [{ variantId: m, quantity: 3 }],
      customerId: maria.id,
      payments: [pix(5000)],
      fiado: true,
      fiadoDueDate: '2026-11-30',
    })
    const res = await confirm(sale.id)
    expect(res.body).toMatchObject({
      paymentStatus: 'partially_paid',
      paidCents: 5000,
      receivable: { originalCents: 10000, balanceCents: 10000, dueDate: '2026-11-30', status: 'open' },
    })
    const [debt] = await db.select().from(receivables)
    expect(debt).toMatchObject({ customerId: maria.id, description: 'Venda #000001', origin: 'sale' })
  })

  test('fiado sem cliente não confirma', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], fiado: true })
    expect((await confirm(sale.id)).body.error.message).toBe('Para deixar valor no fiado, escolha a cliente.')
  })

  test('RN-PAG-06 venda com 100% de desconto não precisa de pagamento', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], discount: { kind: 'percent', value: 10000 } })
    expect((await confirm(sale.id)).body).toMatchObject({ status: 'confirmed', totalCents: 0, paymentStatus: 'paid' })
  })

  test('números só são consumidos na confirmação', async () => {
    const { m } = await blusa()
    const discarded = await newDraft()
    await request('DELETE', `/sales/${discarded.id}`, { cookie })
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [cash(5000)] })
    expect((await confirm(sale.id)).body.numberLabel).toBe('#000001')
  })

  test('RN-VEN-11 venda confirmada não é editada nem descartada', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [cash(5000)] })
    await confirm(sale.id)
    expect((await edit(sale.id, { notes: 'x' })).status).toBe(409)
    expect((await request('DELETE', `/sales/${sale.id}`, { cookie })).status).toBe(422)
  })
})

describe('fiscal e envio', () => {
  async function confirmedSale(extra: Body = {}) {
    const { m } = await blusa()
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [cash(5000)], ...extra })
    return (await confirm(sale.id)).body
  }

  test('RN-FIS-03 consumidor PF: dispensa provável', async () => {
    expect((await confirmedSale()).fiscal).toMatchObject({ buyerType: 'consumer_pf', requirement: 'not_required' })
  })

  test('RN-FIS-01/02 cliente com CNPJ: nota obrigatória', async () => {
    const empresa = await customer({ name: 'Loja X', document: '11.222.333/0001-81' })
    const sale = await confirmedSale({ customerId: empresa.id })
    expect(sale.fiscal).toMatchObject({ buyerType: 'company_pj', requirement: 'required' })
  })

  test('RN-FIS-04 envio para outra UF: revisar com o contador', async () => {
    await request('PUT', '/settings/store', { cookie, body: { uf: 'MT' } })
    const sale = await confirmedSale({ shipping: { enabled: true, address: { city: 'Recife', uf: 'PE' } } })
    expect(sale.shipping).toMatchObject({ status: 'pending', uf: 'PE' })
    expect(sale.fiscal.requirement).toBe('review')
  })

  test('RN-FIS-05 cliente pediu nota depois da venda', async () => {
    const sale = await confirmedSale()
    const res = await request('POST', `/sales/${sale.id}/fiscal-flag`, { cookie })
    expect(res.body.fiscal).toMatchObject({ requested: true, requirement: 'required' })
  })

  test('RN-ENV-01 envio usa o endereço da cliente quando não informado', async () => {
    const maria = await customer({ name: 'Maria', address: { street: 'Rua A', city: 'Cuiabá', uf: 'MT' } })
    const sale = await confirmedSale({ customerId: maria.id, shipping: { enabled: true } })
    expect(sale.shipping).toMatchObject({ status: 'pending', uf: 'MT', address: { street: 'Rua A' } })
  })

  test('RN-ENV-02 aguardando → enviado → entregue, volta um passo, não pula', async () => {
    const sale = await confirmedSale({ shipping: { enabled: true } })
    const skip = await request('PATCH', `/sales/${sale.id}/shipping`, { cookie, body: { status: 'delivered' } })
    expect(skip.status).toBe(422)

    const shipped = await request('PATCH', `/sales/${sale.id}/shipping`, {
      cookie,
      body: { status: 'shipped', trackingCode: 'BR123' },
    })
    expect(shipped.body.shipping).toMatchObject({ status: 'shipped', trackingCode: 'BR123' })
    expect(shipped.body.shipping.shippedAt).not.toBeNull()

    const back = await request('PATCH', `/sales/${sale.id}/shipping`, { cookie, body: { status: 'pending' } })
    expect(back.body.shipping).toMatchObject({ status: 'pending', shippedAt: null })
    expect(back.body.timeline.map((e: Body) => e.type)).toContain('shipping')
  })
})

describe('depois da confirmação', () => {
  test('RN-PAG-05 troca a forma de pagamento com motivo, sem mudar o valor', async () => {
    const { m } = await blusa()
    const sale = await newDraft()
    const payment = pix(5000)
    await edit(sale.id, { items: [{ variantId: m, quantity: 1 }], payments: [payment] })
    await confirm(sale.id)

    const res = await request('POST', `/sales/${sale.id}/payments/${payment.id}/change-method`, {
      cookie,
      body: { method: 'cash', reason: 'Lancei errado' },
    })
    expect(res.body.payments[0]).toMatchObject({ method: 'cash', amountCents: 5000 })
    const change = res.body.timeline.find((e: Body) => e.type === 'payment_method_change')
    expect(change.description).toBe('Forma de pagamento trocada para Dinheiro: Lancei errado')
  })

  test('RN-VEN-13 histórico com filtros e busca por número', async () => {
    const { m } = await blusa()
    const maria = await customer()
    for (const fiado of [false, true]) {
      const sale = await newDraft()
      await edit(sale.id, {
        items: [{ variantId: m, quantity: 1 }],
        customerId: maria.id,
        ...(fiado ? { fiado: true } : { payments: [pix(5000)] }),
      })
      await confirm(sale.id)
    }
    const all = await request('GET', '/sales', { cookie })
    expect(all.body.total).toBe(2)
    expect((await request('GET', '/sales?paymentStatus=unpaid', { cookie })).body.items[0].numberLabel).toBe('#000002')
    expect((await request('GET', '/sales?method=pix', { cookie })).body.items[0].numberLabel).toBe('#000001')
    expect((await request('GET', '/sales?number=2', { cookie })).body.total).toBe(1)
  })

  test('RN-PRO-08 variação que já foi vendida não pode ser excluída', async () => {
    const product = await createProduct(userId, {
      variants: [
        ['Azul', 'P', 0],
        ['Azul', 'M', 0],
      ],
    })
    const sale = await newDraft()
    await edit(sale.id, { items: [{ variantId: product.variants[0]!.id, quantity: 1 }] })
    expect((await request('DELETE', `/variants/${product.variants[0]!.id}`, { cookie })).status).toBe(422)
  })
})

describe('RN-VEN-14 comprovante', () => {
  test('PDF da venda com fiado mostra valor pago, saldo em aberto e “não é documento fiscal”', async () => {
    const { m } = await blusa()
    const maria = await customer()
    const sale = await newDraft()
    await edit(sale.id, {
      items: [{ variantId: m, quantity: 3 }],
      customerId: maria.id,
      payments: [pix(5000)],
      fiado: true,
    })
    await confirm(sale.id)

    const pdf = await request('GET', `/sales/${sale.id}/receipt.pdf`, { cookie })
    expect(pdf.headers.get('content-type')).toBe('application/pdf')
    expect(new TextDecoder().decode((await pdf.response.arrayBuffer()).slice(0, 5))).toBe('%PDF-')

    const text = JSON.stringify((await services.receipts.saleContent(sale.id)).content)
    expect(text).toContain('Comprovante de venda #000001')
    expect(text).toContain('Valor pago')
    expect(text).toContain('Saldo em aberto')
    expect(text).toContain('R$ 100,00')
    expect(text).toContain('Comprovante de venda — não é documento fiscal.')
  })

  test('rascunho não tem comprovante', async () => {
    const sale = await newDraft()
    expect((await request('GET', `/sales/${sale.id}/receipt.pdf`, { cookie })).status).toBe(422)
  })
})

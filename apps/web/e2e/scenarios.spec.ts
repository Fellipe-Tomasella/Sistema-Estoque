import { expect, test } from '@playwright/test'
import { confirmedSale, customerId, draft, variant } from './api'

// Cenários de aceite A1–A10 (docs/04). A ação principal é feita na tela; a conferência, pela API.
// Rodam em série sobre o cenário do e2e-seed (Blusa teste Preta M=3 / G=2 a R$ 100, Vestido R$ 130, Lenço com 1 unidade).
test.describe.configure({ mode: 'serial' })

test('A1 + A6 — venda pelo PDV baixa só a variação vendida, mesmo com clique duplo', async ({ page, request }) => {
  await page.goto('/vender')
  await expect(page.getByText('Rascunho salvo')).toBeVisible()
  const search = page.getByPlaceholder(/Buscar peça/)
  await search.fill('blusa teste preta m')
  await expect(page.getByRole('option').first()).toBeVisible()
  await search.press('Enter')
  await page.getByRole('button', { name: 'Pix' }).click()
  await page.getByText('Pix recebido e conferido').click()
  await expect(page.getByText('Rascunho salvo')).toBeVisible()
  await page.getByRole('button', { name: /Confirmar venda \(R\$/ }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar venda' }).dblclick()
  await expect(page.getByText(/Venda #\d+ confirmada/)).toBeVisible()

  expect((await variant(request, 'blusa teste preta m')).stockQty).toBe(2)
  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(2)
  const sales = await (await request.get('/api/sales')).json()
  expect(sales.total).toBe(1)
})

test('A2 — fiado parcial: recebe R$ 50 de R$ 130, saldo R$ 80, sem mexer no estoque', async ({ page, request }) => {
  const maria = await customerId(request, 'Maria Teste')
  const vestido = await variant(request, 'vestido teste')
  await confirmedSale(request, { items: [{ variantId: vestido.id, quantity: 1 }], customerId: maria.id, fiado: true })

  await page.goto(`/fiado/receber?cliente=${maria.id}`)
  await page.getByLabel('Valor recebido').fill('5000')
  await expect(page.getByText(/Fica/).first()).toBeVisible()
  await page.getByRole('button', { name: /Confirmar recebimento/ }).click()
  await expect(page.getByText(/ainda deve R\$\s*80,00/)).toBeVisible()

  expect((await customerId(request, 'Maria Teste')).openBalanceCents).toBe(8000)
  expect((await variant(request, 'vestido teste')).stockQty).toBe(1)
})

test('A3 — cancelamento com a peça na loja devolve ao estoque uma vez só', async ({ page, request }) => {
  const g = await variant(request, 'blusa teste preta g')
  const saleId = await confirmedSale(request, {
    items: [{ variantId: g.id, quantity: 1 }],
    payments: [{ method: 'cash', amountCents: 10000 }],
    shipping: true,
  })
  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(1)

  await page.goto(`/vendas/${saleId}`)
  await page.getByRole('button', { name: 'Cancelar venda' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('1 peça volta ao estoque.')).toBeVisible()
  await dialog.getByPlaceholder('Ex.: cliente desistiu').fill('desistiu antes de enviar')
  await dialog.getByRole('button', { name: 'Cancelar venda' }).click()
  await expect(page.getByText(/Cancelada em/)).toBeVisible()

  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(2)
  const again = await request.post(`/api/sales/${saleId}/cancel`, { data: { reason: 'de novo', itemsWithStore: true } })
  expect(again.ok()).toBeTruthy()
  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(2)
})

test('A4 — peça com a cliente fica aguardando; ao chegar boa, volta 1 unidade', async ({ page, request }) => {
  const g = await variant(request, 'blusa teste preta g')
  const saleId = await confirmedSale(request, {
    items: [{ variantId: g.id, quantity: 1 }],
    payments: [{ method: 'pix', amountCents: 10000 }],
    shipping: true,
  })
  for (const status of ['shipped', 'delivered']) {
    expect((await request.patch(`/api/sales/${saleId}/shipping`, { data: { status } })).ok()).toBeTruthy()
  }
  await page.goto(`/vendas/${saleId}`)
  await page.getByRole('button', { name: 'Cancelar venda' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('1 peça fica aguardando retorno da cliente.')).toBeVisible()
  await dialog.getByPlaceholder('Ex.: cliente desistiu').fill('não gostou')
  await dialog.getByRole('button', { name: 'Cancelar venda' }).click()
  await expect(page.getByText(/Cancelada em/)).toBeVisible()
  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(1)

  await page.goto('/pendencias?aba=retornos')
  await page.getByRole('button', { name: 'Chegou boa' }).click()
  await expect(page.getByText('Nenhuma peça aguardando')).toBeVisible()
  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(2)
})

test('A5 — cartão aparece no fechamento como transação registrada, não como dinheiro', async ({ page, request }) => {
  const g = await variant(request, 'blusa teste preta g')
  await confirmedSale(request, {
    items: [{ variantId: g.id, quantity: 1 }],
    payments: [{ method: 'card', amountCents: 10000 }],
  })

  await page.goto('/fechamento')
  await expect(page.getByText('Transações de cartão registradas')).toBeVisible()
  const closing = await (
    await request.get(`/api/closings/${(await (await request.get('/api/dashboard')).json()).today}`)
  ).json()
  expect(closing.totals.received.card).toBe(10000)
  expect(closing.totals.expectedCashCents).toBe(closing.totals.balance.cash)
})

test('A7 — acerto por contagem: saldo 2 contado como 5 vira 5 (+3)', async ({ page, request }) => {
  const g = await variant(request, 'blusa teste preta g')
  await page.goto(`/estoque/acertos/novo?variacao=${g.id}`)
  await expect(page.getByText(/saldo atual/)).toBeVisible()
  await page.getByLabel('Quantas peças você contou?').fill('5')
  await page.getByRole('button', { name: 'Salvar acerto' }).click()
  await expect(page).toHaveURL(/\/estoque\/movimentos/)
  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(5)
})

test('A8 — troca de tamanho do mesmo valor: nada a pagar, M volta e G sai', async ({ page, request }) => {
  const m = await variant(request, 'blusa teste preta m')
  const saleId = await confirmedSale(request, {
    items: [{ variantId: m.id, quantity: 1 }],
    payments: [{ method: 'pix', amountCents: 10000 }],
  })
  const before = {
    m: (await variant(request, 'blusa teste preta m')).stockQty,
    g: (await variant(request, 'blusa teste preta g')).stockQty,
  }

  await page.goto(`/vendas/${saleId}/devolver`)
  await page.getByRole('button', { name: 'Troca', exact: true }).click()
  await page.getByRole('button', { name: 'Mais' }).first().click()
  const search = page.getByPlaceholder(/Buscar peça/)
  await search.fill('blusa teste preta g')
  await expect(page.getByRole('option').first()).toBeVisible()
  await search.press('Enter')
  await expect(page.getByText(/R\$\s*100,00 de crédito/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar troca' }).click()
  await expect(page.getByText('Troca registrada.')).toBeVisible()

  expect((await variant(request, 'blusa teste preta m')).stockQty).toBe(before.m + 1)
  expect((await variant(request, 'blusa teste preta g')).stockQty).toBe(before.g - 1)
})

test('A9 — troca com diferença: R$ 100 de crédito + R$ 30 pagos', async ({ page, request }) => {
  const m = await variant(request, 'blusa teste preta m')
  const saleId = await confirmedSale(request, {
    items: [{ variantId: m.id, quantity: 1 }],
    payments: [{ method: 'pix', amountCents: 10000 }],
  })
  await page.goto(`/vendas/${saleId}/devolver?troca=1`)
  await page.getByRole('button', { name: 'Mais' }).first().click()
  const search = page.getByPlaceholder(/Buscar peça/)
  await search.fill('vestido teste')
  await expect(page.getByRole('option').first()).toBeVisible()
  await search.press('Enter')
  await expect(page.getByText(/Cliente paga a diferença/)).toBeVisible()
  await page.getByRole('button', { name: 'Dinheiro', exact: true }).click()
  await page.getByRole('button', { name: /Confirmar troca \(R\$\s*30,00\)/ }).click()
  await expect(page.getByText('Troca registrada.')).toBeVisible()

  await expect(page).toHaveURL(/\/vendas\/[\w-]+$/)
  await expect(page.getByText('Crédito de troca').first()).toBeVisible()
  const exchange = await (await request.get(`/api/sales/${new URL(page.url()).pathname.split('/').pop()}`)).json()
  const paid = Object.fromEntries(
    exchange.payments.map((p: { method: string; amountCents: number }) => [p.method, p.amountCents]),
  )
  expect(paid).toEqual({ exchange_credit: 10000, cash: 3000 })
})

test('A10 — duas confirmações da última unidade ao mesmo tempo: uma passa, outra recusa', async ({ request }) => {
  const lenco = await variant(request, 'lenço último')
  const setup = {
    items: [{ variantId: lenco.id, quantity: 1 }],
    payments: [{ method: 'cash' as const, amountCents: 2000 }],
  }
  const [a, b] = [await draft(request, setup), await draft(request, setup)]
  const results = await Promise.all([a, b].map((id) => request.post(`/api/sales/${id}/confirm`)))
  expect(results.filter((r) => r.ok())).toHaveLength(1)
  expect((await variant(request, 'lenço último')).stockQty).toBe(0)
})

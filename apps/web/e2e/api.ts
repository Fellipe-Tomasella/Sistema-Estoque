import { type APIRequestContext, expect } from '@playwright/test'

/** Mesmo usuário do apps/api/test/e2e-seed.ts. */
export const E2E_USER = { email: 'e2e@loja.test', password: 'senha-e2e-123' }

async function json<T>(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  expect(response.ok(), await response.text()).toBeTruthy()
  return (await response.json()) as T
}

interface Variant {
  id: string
  stockQty: number
}

/** Variação pelo texto da busca do PDV (ex.: “blusa teste preta m”). */
export async function variant(request: APIRequestContext, q: string) {
  const list = await json<Variant[]>(await request.get(`/api/variants/search?q=${encodeURIComponent(q)}`))
  return list[0]!
}

export async function customerId(request: APIRequestContext, q: string) {
  const page = await json<{ items: { id: string; openBalanceCents: number }[] }>(
    await request.get(`/api/customers?q=${encodeURIComponent(q)}`),
  )
  return page.items[0]!
}

interface SaleSetup {
  items: { variantId: string; quantity: number }[]
  payments?: { method: 'cash' | 'pix' | 'card'; amountCents: number }[]
  customerId?: string
  fiado?: boolean
  shipping?: boolean
}

/** Rascunho preenchido pela API (a confirmação fica para o teste decidir). */
export async function draft(request: APIRequestContext, setup: SaleSetup) {
  const created = await json<{ id: string; version: number }>(await request.post('/api/sales'))
  await json(
    await request.patch(`/api/sales/${created.id}`, {
      data: {
        version: created.version,
        items: setup.items,
        customerId: setup.customerId ?? null,
        payments: (setup.payments ?? []).map((p) => ({ ...p, id: crypto.randomUUID(), confirmed: true })),
        fiado: setup.fiado ?? false,
        shipping: { enabled: setup.shipping ?? false },
      },
    }),
  )
  return created.id
}

export async function confirmedSale(request: APIRequestContext, setup: SaleSetup) {
  const id = await draft(request, setup)
  await json(await request.post(`/api/sales/${id}/confirm`))
  return id
}

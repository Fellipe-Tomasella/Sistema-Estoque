import { services } from '../src/container'
import { request } from './http'

export const DEFAULT_PASSWORD = 'senha-segura-123'

let sequence = 0

export function createUser(overrides: { name?: string; email?: string; password?: string } = {}) {
  sequence += 1
  return services.auth.createUser({
    name: overrides.name ?? `Usuária ${sequence}`,
    email: overrides.email ?? `usuaria${sequence}@teste.com`,
    password: overrides.password ?? DEFAULT_PASSWORD,
  })
}

/** Produto com variações; `variants` no formato `[cor, tamanho, saldo inicial]`. */
export async function createProduct(
  userId: string,
  options: { name?: string; basePriceCents?: number; variants?: [string, string, number][] } = {},
) {
  sequence += 1
  return services.products.create(
    {
      name: options.name ?? `Produto ${sequence}`,
      basePriceCents: options.basePriceCents ?? 5000,
      variants: (options.variants ?? [['Preta', 'M', 3]]).map(([color, size, initialQty]) => ({
        color,
        size,
        initialQty,
      })),
    },
    userId,
  )
}

export function createCustomer(name = 'Maria', extra: Record<string, unknown> = {}) {
  return services.customers.create({ name, ...extra })
}

interface SaleOptions {
  /** `[variantId, quantidade]`. Sem itens, cria um produto que custa `totalCents` e vende 1 peça. */
  items?: [string, number][]
  totalCents?: number
  customerId?: string
  payments?: { method: 'cash' | 'pix' | 'card'; amountCents: number }[]
  fiado?: boolean
  fiadoDueDate?: string
  shipping?: boolean
}

/** Venda confirmada pelo mesmo caminho da API (rascunho → edição → confirmação). */
export async function createConfirmedSale(userId: string, options: SaleOptions = {}) {
  let items = options.items
  if (!items) {
    const product = await createProduct(userId, {
      basePriceCents: options.totalCents ?? 5000,
      variants: [['Preta', 'M', 10]],
    })
    items = [[product.variants[0]!.id, 1]]
  }
  const draft = await services.saleDrafts.create(userId)
  await services.saleDrafts.update(draft.id, {
    version: draft.version,
    items: items.map(([variantId, quantity]) => ({ variantId, quantity })),
    customerId: options.customerId ?? null,
    payments: (options.payments ?? []).map((p) => ({ id: crypto.randomUUID(), confirmed: true, ...p })),
    fiado: options.fiado ?? false,
    fiadoDueDate: options.fiadoDueDate ?? null,
    ...(options.shipping ? { shipping: { enabled: true } } : {}),
  })
  return services.saleConfirmation.confirm(draft.id, userId)
}

/** Cria uma usuária e devolve o cookie de sessão já logado. */
export async function loggedIn() {
  const user = await createUser()
  const res = await request('POST', '/auth/login', { body: { email: user.email, password: DEFAULT_PASSWORD } })
  if (!res.sessionCookie) throw new Error(`Login de teste falhou: ${JSON.stringify(res.body)}`)
  return { user, cookie: res.sessionCookie }
}

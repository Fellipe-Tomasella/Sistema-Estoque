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

/** Cria uma usuária e devolve o cookie de sessão já logado. */
export async function loggedIn() {
  const user = await createUser()
  const res = await request('POST', '/auth/login', { body: { email: user.email, password: DEFAULT_PASSWORD } })
  if (!res.sessionCookie) throw new Error(`Login de teste falhou: ${JSON.stringify(res.body)}`)
  return { user, cookie: res.sessionCookie }
}

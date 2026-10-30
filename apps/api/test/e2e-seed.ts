// Prepara o banco de TESTE para os testes E2E (Playwright): migrations, limpa tudo e grava um cenário conhecido.
// Rodado pelo global-setup do Playwright com NODE_ENV=test (usa DATABASE_URL_TEST).
import { env } from '../src/config/env'
import { services } from '../src/container'
import { runMigrations } from '../src/db/migrate'
import { sql } from '../src/db/client'
import { resetDatabase } from './db'

export const E2E_USER = { name: 'Dona E2E', email: 'e2e@loja.test', password: 'senha-e2e-123' }

if (!env.isTest) throw new Error('O cenário E2E só roda no banco de teste (NODE_ENV=test).')

await runMigrations()
await resetDatabase()

const user = await services.auth.createUser(E2E_USER)
await services.settings.update({ storeName: 'Loja E2E', uf: 'SP', timezone: 'America/Sao_Paulo' }, user.id)

const v = (color: string, size: string, initialQty: number) => ({ color, size, initialQty, minStock: 0 })
// A1/A8: Preta M = 3, Preta G = 2, R$ 100. A9: vestido de R$ 130. A10: última unidade.
await services.products.create(
  {
    name: 'Blusa teste',
    basePriceCents: 10000,
    category: 'Blusas',
    variants: [v('Preta', 'M', 3), v('Preta', 'G', 2)],
  },
  user.id,
)
await services.products.create(
  { name: 'Vestido teste', basePriceCents: 13000, category: 'Vestidos', variants: [v('Azul', 'U', 2)] },
  user.id,
)
await services.products.create(
  { name: 'Lenço último', basePriceCents: 2000, category: 'Acessórios', variants: [v('Vermelho', 'U', 1)] },
  user.id,
)
await services.customers.create({ name: 'Maria Teste', phone: '(11) 90000-0001' })

await sql.end()
console.log('Cenário E2E pronto.')

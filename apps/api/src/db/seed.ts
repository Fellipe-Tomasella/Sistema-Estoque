// Dados de exemplo para desenvolvimento (nunca rodar em produção). Pode rodar de novo: não duplica.
// Conta de desenvolvimento: dona@loja.dev / senha-dev-123
import { services } from '../container'
import { env } from '../config/env'
import { run } from '../scripts/cli'

const DEV_EMAIL = 'dona@loja.dev'
const DEV_PASSWORD = 'senha-dev-123'

await run(async () => {
  if (env.isProduction) throw new Error('Seed é só para desenvolvimento.')

  const existing = await services.products.list({ status: 'all', pageSize: 1 })
  if (existing.total > 0) {
    console.log('Banco já tem dados; seed ignorado.')
    return
  }

  const user = await services.auth.createUser({ name: 'Dona da Loja', email: DEV_EMAIL, password: DEV_PASSWORD })
  await services.settings.update({ storeName: 'Ateliê Exemplo', uf: 'MT', city: 'Cuiabá' }, user.id)

  const sizes = (list: string[], color: string, qty: number, minStock = 1) =>
    list.map((size) => ({ color, size, initialQty: qty, minStock }))

  const blusa = await services.products.create(
    {
      name: 'Blusa básica',
      basePriceCents: 4990,
      category: 'Blusas',
      variants: [...sizes(['P', 'M', 'G'], 'Preta', 3), ...sizes(['P', 'M'], 'Branca', 2)],
    },
    user.id,
  )
  await services.products.create(
    {
      name: 'Calça jeans skinny',
      basePriceCents: 12990,
      category: 'Calças',
      variants: sizes(['36', '38', '40', '42'], 'Azul', 2),
    },
    user.id,
  )
  await services.products.create(
    {
      name: 'Vestido midi floral',
      basePriceCents: 15990,
      category: 'Vestidos',
      variants: sizes(['U'], 'Estampado', 4),
    },
    user.id,
  )
  await services.products.create(
    { name: 'Saia plissada', basePriceCents: 8990, category: 'Saias', variants: sizes(['P', 'M'], 'Rosa', 0, 2) },
    user.id,
  )

  const maria = await services.customers.create({ name: 'Maria Souza', phone: '(65) 99999-0001' })
  await services.customers.create({ name: 'Ana Lima', phone: '(65) 98888-0002' })

  // Uma venda paga e uma com entrada + fiado, para o Início e os relatórios terem o que mostrar.
  const variant = (label: string) => blusa.variants.find((v) => v.label === label)!.id
  for (const [label, fiado] of [
    ['Preta / M', false],
    ['Branca / P', true],
  ] as const) {
    const draft = await services.saleDrafts.create(user.id)
    await services.saleDrafts.update(draft.id, {
      version: draft.version,
      items: [{ variantId: variant(label), quantity: 1 }],
      customerId: maria.id,
      payments: [{ id: crypto.randomUUID(), method: 'pix', amountCents: fiado ? 1990 : 4990, confirmed: true }],
      fiado,
    })
    await services.saleConfirmation.confirm(draft.id, user.id)
  }

  console.log(`Seed concluído. Entre com ${DEV_EMAIL} / ${DEV_PASSWORD}`)
})

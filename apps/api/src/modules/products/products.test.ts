import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { auditLog, stockMovements } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string

beforeEach(async () => {
  await resetDatabase()
  const session = await loggedIn()
  cookie = session.cookie
  userId = session.user.id
})

const post = (path: string, body: unknown) => request('POST', path, { cookie, body })

describe('cadastro de produto', () => {
  test('aceite da etapa: Blusa básica com Preta/P, Preta/M, Branca/M e saldos aparece certa', async () => {
    const res = await post('/products', {
      name: 'Blusa básica',
      basePriceCents: 4990,
      variants: [
        { color: 'Preta', size: 'M', initialQty: 3 },
        { color: 'Preta', size: 'P', initialQty: 2 },
        { color: 'Branca', size: 'M', initialQty: 0 },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.totalStock).toBe(5)
    expect(res.body.variants.map((v: { label: string; stockQty: number }) => [v.label, v.stockQty])).toEqual([
      ['Branca / M', 0],
      ['Preta / P', 2],
      ['Preta / M', 3],
    ])
  })

  test('RN-PRO-01 produto sem variação é recusado', async () => {
    const res = await post('/products', { name: 'Saia', basePriceCents: 1000, variants: [] })
    expect(res.status).toBe(400)
  })

  test('RN-PRO-02 cor e tamanho repetidos (maiúsculas/espaços) são recusados', async () => {
    const res = await post('/products', {
      name: 'Saia',
      basePriceCents: 1000,
      variants: [
        { color: 'Preta', size: 'M' },
        { color: ' preta ', size: 'm' },
      ],
    })
    expect(res.status).toBe(409)
    expect(res.body.error.message).toContain('já existe')
  })

  test('RN-PRO-02 nova variação que colide com existente é recusada', async () => {
    const product = await createProduct(userId, { variants: [['Preta', 'M', 1]] })
    const res = await post(`/products/${product.id}/variants`, { variants: [{ color: 'PRETA', size: 'M' }] })
    expect(res.status).toBe(409)
  })

  test('RN-PRO-04 tamanhos ordenados: letras, números, desconhecidos, único', async () => {
    const product = await createProduct(userId, {
      variants: [
        ['Azul', 'U', 0],
        ['Azul', '38', 0],
        ['Azul', 'GG', 0],
        ['Azul', 'P', 0],
        ['Azul', 'Infantil', 0],
      ],
    })
    expect(product.variants.map((v) => v.size)).toEqual(['P', 'GG', '38', 'Infantil', 'U'])
  })

  test('RN-PRO-05 preço da variação vazio usa o preço base', async () => {
    const res = await post('/products', {
      name: 'Calça',
      basePriceCents: 10000,
      variants: [
        { color: 'Azul', size: '38' },
        { color: 'Azul', size: '50', priceCents: 12000 },
      ],
    })
    const prices = res.body.variants.map((v: { effectivePriceCents: number }) => v.effectivePriceCents)
    expect(prices).toEqual([10000, 12000])
  })

  test('RN-PRO-11 campos opcionais não bloqueiam e textos vazios viram nulos', async () => {
    const res = await post('/products', {
      name: '  Vestido   longo ',
      basePriceCents: 0,
      reference: '',
      category: ' Vestidos ',
      variants: [{ color: 'Verde', size: 'U' }],
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Vestido longo', reference: null, category: 'Vestidos' })
  })

  test('preço negativo é recusado', async () => {
    const res = await post('/products', { name: 'X', basePriceCents: -1, variants: [{ color: 'A', size: 'U' }] })
    expect(res.status).toBe(400)
  })
})

describe('RN-EST-02 saldo inicial', () => {
  test('gera movimento initial só para quantidades maiores que zero', async () => {
    const product = await createProduct(userId, {
      variants: [
        ['Preta', 'M', 3],
        ['Preta', 'G', 0],
      ],
    })
    const movements = await db.select().from(stockMovements)
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      variantId: product.variants.find((v) => v.size === 'M')!.id,
      type: 'initial',
      quantityDelta: 3,
      balanceAfter: 3,
      createdBy: userId,
    })
    expect(movements[0]!.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('edição', () => {
  test('RN-PRO-06 mudança de nome e preço fica auditada', async () => {
    const product = await createProduct(userId, { basePriceCents: 5000 })
    const res = await request('PATCH', `/products/${product.id}`, { cookie, body: { basePriceCents: 5500 } })
    expect(res.body.basePriceCents).toBe(5500)
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, 'update'))
    expect(entry).toMatchObject({ before: { basePriceCents: 5000 }, after: { basePriceCents: 5500 } })
  })

  test('RN-LOJ-01 a 04: produto começa fora do site; preço do site não muda o PDV e fica auditado', async () => {
    const product = await createProduct(userId, { basePriceCents: 5000 })
    expect(product.site).toEqual({ visible: false, priceCents: null, hidePrice: false, description: null })

    const res = await request('PATCH', `/products/${product.id}`, {
      cookie,
      body: { showOnSite: true, sitePriceCents: 4500, hideSitePrice: true, siteDescription: '  Renda francesa  ' },
    })
    expect(res.body.site).toEqual({ visible: true, priceCents: 4500, hidePrice: true, description: 'Renda francesa' })
    expect(res.body.basePriceCents).toBe(5000)
    expect(res.body.variants[0].effectivePriceCents).toBe(5000)
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, 'update'))
    expect(entry).toMatchObject({
      before: { showOnSite: false, sitePriceCents: null },
      after: { showOnSite: true, sitePriceCents: 4500 },
    })

    const cleared = await request('PATCH', `/products/${product.id}`, { cookie, body: { sitePriceCents: null } })
    expect(cleared.body.site.priceCents).toBeNull()
  })

  test('RN-PRO-09 corrigir cor/tamanho com histórico é permitido e auditado, sem colidir', async () => {
    const product = await createProduct(userId, {
      variants: [
        ['Pretaa', 'M', 2],
        ['Branca', 'M', 1],
      ],
    })
    const typo = product.variants.find((v) => v.color === 'Pretaa')!
    const ok = await request('PATCH', `/variants/${typo.id}`, { cookie, body: { color: 'Preta' } })
    expect(ok.status).toBe(200)
    expect(ok.body.label).toBe('Preta / M')

    const clash = await request('PATCH', `/variants/${typo.id}`, { cookie, body: { color: 'branca' } })
    expect(clash.status).toBe(409)

    const audits = await db.select().from(auditLog).where(eq(auditLog.entity, 'variant'))
    expect(audits[0]).toMatchObject({ before: { color: 'Pretaa' }, after: { color: 'Preta' } })
  })

  test('RN-EST-09 mínimo para todas as variações de uma vez, e individual depois', async () => {
    const product = await createProduct(userId, {
      variants: [
        ['Preta', 'M', 2],
        ['Preta', 'G', 5],
      ],
    })
    const all = await post(`/products/${product.id}/min-stock`, { minStock: 2 })
    expect(all.body.variants.map((v: { minStock: number }) => v.minStock)).toEqual([2, 2])
    expect(all.body.variants.map((v: { stockStatus: string }) => v.stockStatus)).toEqual(['low', 'ok'])

    const g = product.variants.find((v) => v.size === 'G')!
    const one = await request('PATCH', `/variants/${g.id}`, { cookie, body: { minStock: null } })
    expect(one.body.minStock).toBeNull()
  })
})

describe('RN-PRO-07 inativação', () => {
  test('produto inativo some da lista padrão e da busca do PDV, mas continua consultável', async () => {
    const product = await createProduct(userId, { name: 'Blusa listrada' })
    await post(`/products/${product.id}/deactivate`, {})

    const list = await request('GET', '/products', { cookie })
    expect(list.body.items).toHaveLength(0)
    const search = await request('GET', '/variants/search?q=listrada', { cookie })
    expect(search.body).toHaveLength(0)

    const inactive = await request('GET', '/products?status=inactive', { cookie })
    expect(inactive.body.items.map((p: { id: string }) => p.id)).toEqual([product.id])
    expect((await request('GET', `/products/${product.id}`, { cookie })).body.active).toBe(false)

    await post(`/products/${product.id}/activate`, {})
    expect((await request('GET', '/products', { cookie })).body.items).toHaveLength(1)
  })

  test('variação inativa sai da lista padrão e da busca', async () => {
    const product = await createProduct(userId, {
      variants: [
        ['Preta', 'M', 1],
        ['Preta', 'G', 1],
      ],
    })
    const g = product.variants.find((v) => v.size === 'G')!
    await request('PATCH', `/variants/${g.id}`, { cookie, body: { active: false } })

    const list = await request('GET', '/products', { cookie })
    expect(list.body.items[0].variants.map((v: { size: string }) => v.size)).toEqual(['M'])
    const all = await request('GET', '/products?status=all', { cookie })
    expect(all.body.items[0].variants).toHaveLength(2)
  })
})

describe('RN-PRO-08 exclusão', () => {
  test('produto sem nenhum movimento pode ser excluído', async () => {
    const product = await createProduct(userId, { variants: [['Preta', 'M', 0]] })
    expect((await request('DELETE', `/products/${product.id}`, { cookie })).status).toBe(200)
    expect((await request('GET', `/products/${product.id}`, { cookie })).status).toBe(404)
  })

  test('produto com movimento de estoque só pode ser inativado', async () => {
    const product = await createProduct(userId, { variants: [['Preta', 'M', 1]] })
    const res = await request('DELETE', `/products/${product.id}`, { cookie })
    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('só inativado')
  })

  test('variação sem histórico pode ser excluída, mas não a última do produto', async () => {
    const product = await createProduct(userId, {
      variants: [
        ['Preta', 'M', 0],
        ['Preta', 'G', 0],
      ],
    })
    const [first, second] = product.variants
    expect((await request('DELETE', `/variants/${first!.id}`, { cookie })).status).toBe(200)
    expect((await request('DELETE', `/variants/${second!.id}`, { cookie })).status).toBe(422)
  })
})

describe('RN-PRO-10 busca e filtros', () => {
  beforeEach(async () => {
    await services.products.create(
      {
        name: 'Blusa Básica',
        basePriceCents: 4990,
        category: 'Blusas',
        variants: [
          { color: 'Preta', size: 'M', initialQty: 3, minStock: 3 },
          { color: 'Branca', size: 'G', initialQty: 0 },
        ],
      },
      userId,
    )
    await createProduct(userId, { name: 'Calça jeans', variants: [['Azul', '38', 5]] })
  })

  const names = (body: { items: { name: string }[] }) => body.items.map((p) => p.name)

  test('nome sem diferenciar acentos e maiúsculas', async () => {
    expect(names((await request('GET', '/products?q=BASICA', { cookie })).body)).toEqual(['Blusa Básica'])
  })

  test('curingas digitados não viram curinga do SQL', async () => {
    expect(names((await request('GET', '/products?q=%25', { cookie })).body)).toEqual([])
  })

  test('por cor e tamanho, trazendo só as variações que combinam', async () => {
    const res = await request('GET', '/products?color=preta&size=m', { cookie })
    expect(names(res.body)).toEqual(['Blusa Básica'])
    expect(res.body.items[0].variants).toHaveLength(1)
  })

  test('por categoria', async () => {
    expect(names((await request('GET', '/products?category=blusas', { cookie })).body)).toEqual(['Blusa Básica'])
  })

  test('sem estoque e repor', async () => {
    const out = await request('GET', '/products?stock=out', { cookie })
    expect(out.body.items[0].variants.map((v: { label: string }) => v.label)).toEqual(['Branca / G'])
    const low = await request('GET', '/products?stock=low', { cookie })
    expect(low.body.items[0].variants.map((v: { label: string }) => v.label)).toEqual(['Preta / M'])
  })

  test('paginação', async () => {
    const res = await request('GET', '/products?pageSize=1&page=2', { cookie })
    expect(res.body).toMatchObject({ page: 2, pageSize: 1, total: 2 })
    expect(names(res.body)).toEqual(['Calça jeans'])
  })

  test('busca rápida do PDV casa nome, cor e tamanho', async () => {
    const res = await request('GET', '/variants/search?q=blusa%20preta%20m', { cookie })
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ productName: 'Blusa Básica', label: 'Preta / M', stockQty: 3 })
  })

  test('sugestões de cores, tamanhos e categorias já usados', async () => {
    const res = await request('GET', '/products/suggestions', { cookie })
    expect(res.body).toEqual({ colors: ['Azul', 'Branca', 'Preta'], sizes: ['M', 'G', '38'], categories: ['Blusas'] })
  })
})

test('variação por id traz o nome do produto', async () => {
  const product = await createProduct(userId, { name: 'Saia', variants: [['Rosa', 'P', 2]] })
  const res = await request('GET', `/variants/${product.variants[0]!.id}`, { cookie })
  expect(res.body).toMatchObject({ productName: 'Saia', label: 'Rosa / P', stockQty: 2 })
})

test('rotas de produto exigem login', async () => {
  expect((await request('GET', '/products')).status).toBe(401)
})

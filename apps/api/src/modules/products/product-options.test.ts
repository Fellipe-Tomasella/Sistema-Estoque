import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { products, variants } from '../../db/schema'
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

const values = (list: { value: string }[]) => list.map((o) => o.value)

describe('RN-PRO-17 aba Opções (cores, tamanhos, categorias)', () => {
  test('lista cada opção com quantas peças ativas a usam', async () => {
    await createProduct(userId, {
      name: 'Body',
      variants: [
        ['Preta', 'M', 1],
        ['Pretaa', 'M', 0],
      ],
    })
    const res = await request('GET', '/products/options', { cookie })
    expect(res.status).toBe(200)
    expect(res.body.colors).toEqual([
      { value: 'Preta', activeCount: 1, inactiveCount: 0, products: ['Body'] },
      { value: 'Pretaa', activeCount: 1, inactiveCount: 0, products: ['Body'] },
    ])
    expect(values(res.body.sizes)).toEqual(['M'])
  })

  test('renomear corrige a cor em todas as peças; colisão no mesmo produto é barrada', async () => {
    await createProduct(userId, {
      name: 'Body',
      variants: [
        ['Pretaa', 'M', 1],
        ['Preta', 'M', 0],
      ],
    })
    await createProduct(userId, { name: 'Calcinha', variants: [['Pretaa', 'P', 1]] })
    const blocked = await request('PUT', '/products/options/color', { cookie, body: { from: 'Pretaa', to: 'preta' } })
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.message).toContain('Body')

    const ok = await request('PUT', '/products/options/color', { cookie, body: { from: 'Pretaa', to: 'Vinho' } })
    expect(ok.status).toBe(200)
    expect(values(ok.body.colors)).toEqual(['Preta', 'Vinho'])
    const rows = await db.select({ color: variants.color }).from(variants).where(eq(variants.color, 'Vinho'))
    expect(rows).toHaveLength(2)
  })

  test('renomear tamanho tira espaços e reordena', async () => {
    await createProduct(userId, {
      name: 'Body',
      variants: [
        ['Preta', 'gg ', 1],
        ['Preta', 'P', 1],
      ],
    })
    const res = await request('PUT', '/products/options/size', { cookie, body: { from: 'gg', to: ' M ' } })
    expect(values(res.body.sizes)).toEqual(['P', 'M'])
  })

  test('excluir só quando nenhuma peça ativa usa; depois some das sugestões', async () => {
    const body = await createProduct(userId, {
      name: 'Body',
      variants: [
        ['Rosa', 'M', 1],
        ['Azul', 'M', 1],
      ],
    })
    const blocked = await request('DELETE', '/products/options/color?value=Rosa', { cookie })
    expect(blocked.status).toBe(422)
    expect(blocked.body.error.message).toContain('1 peça ativa')
    expect(blocked.body.error.message).toContain('Body')

    const rosa = body.variants.find((v) => v.color === 'Rosa')!
    await db.update(variants).set({ active: false }).where(eq(variants.id, rosa.id))
    const ok = await request('DELETE', '/products/options/color?value=Rosa', { cookie })
    expect(ok.status).toBe(200)
    expect(values(ok.body.colors)).toEqual(['Azul'])
    const suggestions = await request('GET', '/products/suggestions', { cookie })
    expect(suggestions.body.colors).toEqual(['Azul'])

    // voltou a ser usada por uma peça ativa: aparece de novo
    await db.update(variants).set({ active: true }).where(eq(variants.id, rosa.id))
    expect((await request('GET', '/products/suggestions', { cookie })).body.colors).toContain('Rosa')
  })

  test('categoria: renomeia nos produtos e só exclui sem produto ativo', async () => {
    const body = await createProduct(userId, { name: 'Body' })
    await db.update(products).set({ category: 'Bodys' }).where(eq(products.id, body.id))
    const renamed = await request('PUT', '/products/options/category', {
      cookie,
      body: { from: 'Bodys', to: 'Bodies' },
    })
    expect(values(renamed.body.categories)).toEqual(['Bodies'])
    expect((await request('DELETE', '/products/options/category?value=Bodies', { cookie })).status).toBe(422)
  })

  test('exige login', async () => {
    expect((await request('GET', '/products/options')).status).toBe(401)
  })
})

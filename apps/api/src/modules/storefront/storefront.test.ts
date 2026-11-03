import { beforeEach, describe, expect, test } from 'bun:test'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'
import { renderStorefront } from './site/storefront-site'

let cookie: string
let userId: string

beforeEach(async () => {
  await resetDatabase()
  const session = await loggedIn()
  cookie = session.cookie
  userId = session.user.id
})

const put = (body: unknown) => request('PUT', '/storefront/settings', { cookie, body })
const sid = () => cookie.replace(/^sid=/, '')

async function visit(path: string, logged = false) {
  const res = await renderStorefront(services, new URL(`http://localhost${path}`), logged ? { sid: sid() } : {})
  return res && { status: res.status, location: res.headers.get('location'), text: await res.text() }
}

async function openStore() {
  await put({ slug: 'jooliv-lingeries', enabled: true, whatsapp: '(11) 99999-8888', title: 'Jooliv Lingeries' })
}

describe('configuração da loja virtual', () => {
  test('normaliza WhatsApp (DDI 55), Instagram e e-mail de aviso', async () => {
    const res = await put({
      slug: 'jooliv-lingeries',
      whatsapp: '(11) 99999-8888',
      instagram: '@jooliv',
      notifyEmail: ' Fellipe@Gmail.com ',
    })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      slug: 'jooliv-lingeries',
      whatsapp: '5511999998888',
      instagram: 'jooliv',
      notifyEmail: 'fellipe@gmail.com',
      enabled: false,
    })
  })

  test('recusa endereço que já é tela do painel e site no ar sem endereço', async () => {
    const reserved = await put({ slug: 'vendas' })
    expect(reserved.status).toBe(400)
    expect(reserved.body.error.message).toContain('tela do sistema')

    const noSlug = await put({ enabled: true })
    expect(noSlug.status).toBe(400)
    expect(noSlug.body.error.message).toContain('endereço do site')
    expect((await services.storefront.getSettings()).enabled).toBe(false)
  })
})

describe('site público', () => {
  test('RN-LOJ-01: só produtos ativos marcados para o site; preço do site e “Consulte”', async () => {
    await openStore()
    const shown = await createProduct(userId, { name: 'Body renda', basePriceCents: 8990 })
    await services.products.update(shown.id, { showOnSite: true, sitePriceCents: 7990 }, userId)
    const hidden = await createProduct(userId, { name: 'Peça interna' })
    const consult = await createProduct(userId, { name: 'Robe <seda>' })
    await services.products.update(consult.id, { showOnSite: true, hideSitePrice: true }, userId)
    const inactive = await createProduct(userId, { name: 'Antiga' })
    await services.products.update(inactive.id, { showOnSite: true }, userId)
    await services.products.setActive(inactive.id, false, userId)

    const home = (await visit('/jooliv-lingeries'))!
    expect(home.status).toBe(200)
    expect(home.text).toContain('Body renda')
    expect(home.text).toContain('R$ 79,90')
    expect(home.text).not.toContain('89,90')
    expect(home.text).not.toContain(hidden.name)
    expect(home.text).not.toContain('Antiga')
    expect(home.text).toContain('Consulte')
    // texto vindo do cadastro é escapado
    expect(home.text).toContain('Robe &lt;seda&gt;')
    expect(home.text).not.toContain('<seda>')
  })

  test('página do produto: tamanhos esgotados, link do WhatsApp e endereço canônico', async () => {
    await openStore()
    const product = await createProduct(userId, {
      name: 'Sutiã Bella',
      variants: [
        ['Preta', 'P', 0],
        ['Preta', 'M', 2],
      ],
    })
    await services.products.update(product.id, { showOnSite: true }, userId)

    const old = (await visit(`/jooliv-lingeries/p/${product.id}/nome-antigo`))!
    expect(old.status).toBe(301)
    expect(old.location).toEndWith(`/jooliv-lingeries/p/${product.id}/sutia-bella`)

    const page = (await visit(`/jooliv-lingeries/p/${product.id}/sutia-bella`))!
    expect(page.status).toBe(200)
    expect(page.text).toContain('https://wa.me/5511999998888?text=')
    expect(page.text).toContain('"available":false')
    expect(page.text).toContain('og:title')
    expect(page.text).not.toContain('stockQty')

    const other = await createProduct(userId, { name: 'Fora do site' })
    expect((await visit(`/jooliv-lingeries/p/${other.id}/x`))!.status).toBe(404)
  })

  test('sem estoque: “Esgotado” por padrão; some do site se a dona escolher esconder', async () => {
    await openStore()
    const product = await createProduct(userId, { name: 'Calcinha zero', variants: [['Nude', 'M', 0]] })
    await services.products.update(product.id, { showOnSite: true }, userId)
    expect((await visit('/jooliv-lingeries'))!.text).toContain('Esgotado')

    await put({ hideSoldOut: true })
    expect((await visit('/jooliv-lingeries'))!.text).not.toContain('Calcinha zero')
  })

  test('sacola e privacidade: páginas do site com o formulário curto e o aceite', async () => {
    await openStore()
    const bag = (await visit('/jooliv-lingeries/sacola'))!
    expect(bag.status).toBe(200)
    expect(bag.text).toContain('Finalizar pedido')
    expect(bag.text).toContain('name="consent"')
    expect(bag.text).toContain('name="website"')
    expect((await visit('/jooliv-lingeries/privacidade'))!.text).toContain('Política de privacidade')
  })

  test('site desligado: só quem está logada vê (pré-visualização); outro caminho fica com o painel', async () => {
    await put({ slug: 'jooliv-lingeries' })
    expect(await visit('/jooliv-lingeries')).toBeNull()
    const preview = (await visit('/jooliv-lingeries', true))!
    expect(preview.text).toContain('Pré-visualização')
    expect(preview.text).toContain('noindex')

    expect(await visit('/vendas')).toBeNull()
    expect(await visit('/outra-loja', true)).toBeNull()
  })
})

import { beforeEach, describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string
let productId: string

beforeEach(async () => {
  await resetDatabase()
  const session = await loggedIn()
  cookie = session.cookie
  userId = session.user.id
  const product = await createProduct(userId, {
    variants: [
      ['Preta', 'M', 1],
      ['Vermelha', 'P', 1],
    ],
  })
  productId = product.id
})

const photo = (width = 2400, height = 1600) =>
  sharp({ create: { width, height, channels: 3, background: '#a33' } })
    .jpeg()
    .toBuffer()

async function upload(file: Blob | Buffer, color?: string) {
  const form = new FormData()
  form.append(
    'file',
    file instanceof Blob ? file : new File([new Uint8Array(file)], 'foto.jpg', { type: 'image/jpeg' }),
  )
  if (color) form.append('color', color)
  return request('POST', `/products/${productId}/images`, { cookie, body: form })
}

describe('fotos do produto', () => {
  test('envia, gera miniatura e tamanho grande em WebP e aparece no produto e na busca do PDV', async () => {
    const res = await upload(await photo())
    expect(res.status).toBe(201)
    const [image] = res.body
    expect([image.width, image.height]).toEqual([1600, 1067])

    const thumb = await request('GET', image.thumbUrl.replace('/api', ''))
    expect(thumb.status).toBe(200)
    expect(thumb.headers.get('content-type')).toBe('image/webp')
    expect(thumb.headers.get('cache-control')).toContain('immutable')
    const meta = await sharp(Buffer.from(await thumb.response.arrayBuffer())).metadata()
    expect([meta.format, meta.width]).toEqual(['webp', 400])

    const product = await request('GET', `/products/${productId}`, { cookie })
    expect(product.body.coverUrl).toBe(image.thumbUrl)
    const search = await request('GET', '/variants/search?q=Produto', { cookie })
    expect(search.body.every((v: { coverUrl: string }) => v.coverUrl === image.thumbUrl)).toBe(true)
  })

  test('RN-PRO-12: no máximo 5 fotos por produto', async () => {
    const jpeg = await photo(200, 200)
    for (let i = 0; i < 5; i++) expect((await upload(jpeg)).status).toBe(201)
    const res = await upload(jpeg)
    expect(res.status).toBe(422)
    expect(res.body.error.message).toContain('5 fotos')
  })

  test('recusa arquivo que não é foto, sem deixar registro', async () => {
    const res = await upload(new File(['não sou imagem'], 'nota.txt', { type: 'text/plain' }))
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('não reconhecido como foto')
    expect(await services.productImages.list(productId)).toHaveLength(0)
  })

  test('RN-PRO-14: foto da cor vira a miniatura daquela variação; cor inexistente é recusada', async () => {
    await upload(await photo(300, 300))
    const [, red] = (await upload(await photo(300, 300), 'vermelha')).body
    expect(red.color).toBe('Vermelha')

    const search = await request('GET', '/variants/search?q=Vermelha', { cookie })
    expect(search.body[0].coverUrl).toBe(red.thumbUrl)

    const res = await upload(await photo(300, 300), 'Azul')
    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('Essa cor não existe neste produto.')
  })

  test('RN-PRO-13: reordenar muda a capa; lista diferente da atual é recusada', async () => {
    await upload(await photo(300, 300))
    const [first, second] = (await upload(await photo(300, 300))).body
    const res = await request('POST', `/products/${productId}/images/order`, {
      cookie,
      body: { ids: [second.id, first.id] },
    })
    expect(res.body.map((i: { id: string }) => i.id)).toEqual([second.id, first.id])
    expect((await request('GET', `/products/${productId}`, { cookie })).body.coverUrl).toBe(second.thumbUrl)

    const stale = await request('POST', `/products/${productId}/images/order`, { cookie, body: { ids: [first.id] } })
    expect(stale.status).toBe(400)
  })

  test('esconder do site e excluir: a foto some, a ordem se refaz e o arquivo é apagado', async () => {
    await upload(await photo(300, 300))
    const [first, second] = (await upload(await photo(300, 300))).body

    const hidden = await request('PATCH', `/products/${productId}/images/${second.id}`, {
      cookie,
      body: { showOnSite: false },
    })
    expect(hidden.body[1].showOnSite).toBe(false)

    const res = await request('DELETE', `/products/${productId}/images/${first.id}`, { cookie })
    expect(res.body.map((i: { id: string }) => i.id)).toEqual([second.id])
    expect((await request('GET', first.thumbUrl.replace('/api', ''))).status).toBe(404)
  })

  test('excluir o produto sem histórico apaga as fotos', async () => {
    const fresh = await services.products.create(
      { name: 'Sem saldo', basePriceCents: 100, variants: [{ color: 'Preta', size: 'U' }] },
      userId,
    )
    productId = fresh.id
    const [image] = (await upload(await photo(300, 300))).body
    expect((await request('DELETE', `/products/${productId}`, { cookie })).status).toBe(200)
    expect((await request('GET', image.thumbUrl.replace('/api', ''))).status).toBe(404)
  })

  test('foto exige login para enviar, mas é pública para ver; nome fora do padrão dá 404', async () => {
    const form = new FormData()
    form.append('file', new File([new Uint8Array(await photo(100, 100))], 'f.jpg'))
    expect((await request('POST', `/products/${productId}/images`, { body: form })).status).toBe(401)
    expect((await request('GET', '/media/..%2F..%2F.env')).status).toBe(404)
  })
})

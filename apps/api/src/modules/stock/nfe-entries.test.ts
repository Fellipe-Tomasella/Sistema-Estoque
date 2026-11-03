import { beforeEach, describe, expect, test } from 'bun:test'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

const xml = await Bun.file(new URL('../../../test/fixtures/nfe-exemplo.xml', import.meta.url)).text()
let cookie: string
let userId: string

beforeEach(async () => {
  await resetDatabase()
  const session = await loggedIn()
  cookie = session.cookie
  userId = session.user.id
})

async function preview(content = xml) {
  const form = new FormData()
  form.append('file', new File([content], 'nota.xml', { type: 'text/xml' }))
  return request('POST', '/stock/entries/nfe-preview', { cookie, body: form })
}

describe('código padrão do produto (RN-PRO-15)', () => {
  test('produto sem referência ganha P00001…, variação ganha SKU; referência digitada é mantida', async () => {
    const a = await createProduct(userId, { name: 'Blusa', variants: [['Azul claro', 'GG', 1]] })
    const b = await services.products.create(
      { name: 'Saia', reference: 'SA-10', basePriceCents: 100, variants: [{ color: 'Preta', size: 'M' }] },
      userId,
    )
    const c = await createProduct(userId, { name: 'Vestido' })
    expect([a.reference, b.reference, c.reference]).toEqual(['P00001', 'SA-10', 'P00002'])
    expect(a.variants[0]!.sku).toBe('P00001-AZUC-GG')
    expect(b.variants[0]!.sku).toBe('SA-10-PRE-M')
  })

  test('código de barras é único e acha a peça na busca do PDV', async () => {
    const p = await createProduct(userId, { name: 'Body' })
    const res = await request('PATCH', `/variants/${p.variants[0]!.id}`, {
      cookie,
      body: { barcode: '789 1234 567895' },
    })
    expect(res.body.barcode).toBe('7891234567895')
    const search = await request('GET', '/variants/search?q=7891234567895', { cookie })
    expect(search.body.map((v: { id: string }) => v.id)).toEqual([p.variants[0]!.id])

    const other = await createProduct(userId, { name: 'Outra' })
    const dup = await request('PATCH', `/variants/${other.variants[0]!.id}`, {
      cookie,
      body: { barcode: '7891234567895' },
    })
    expect(dup.status).toBe(409)
    expect(dup.body.error.message).toContain('código de barras')
    expect(
      (await request('PATCH', `/variants/${other.variants[0]!.id}`, { cookie, body: { barcode: '12' } })).status,
    ).toBe(400)
  })
})

describe('entrada pela NF-e (RN-EST-11)', () => {
  test('prévia lê a nota e sugere variação por código de barras e por SKU; fracionada é sinalizada', async () => {
    const blusa = await createProduct(userId, {
      name: 'Blusa renda',
      variants: [
        ['Preta', 'P', 0],
        ['Preta', 'M', 0],
      ],
    })
    const [p, m] = blusa.variants
    await services.products.updateVariant(p!.id, { barcode: '7891234567895' }, userId)
    await services.products.updateVariant(m!.id, { sku: 'BL-01-M' }, userId)

    const res = await preview()
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      accessKey: '35261112345678000195550010000012341000012345',
      number: '1234',
      issuedAt: '2026-11-01',
      supplier: { name: 'Exemplo Moda', document: '12345678000195' },
    })
    const [i1, i2, i3] = res.body.items
    expect(i1).toMatchObject({ quantity: 3, unitCostCents: 2550, match: { variantId: p!.id, by: 'barcode' } })
    expect(i2).toMatchObject({ quantity: 3, fractional: true, match: { variantId: m!.id, by: 'sku' } })
    expect(i3.match).toBeNull()
  })

  test('lançar soma o estoque, guarda o custo, lembra o vínculo e não aceita a mesma nota de novo', async () => {
    const product = await createProduct(userId, { name: 'Peça', variants: [['Nude', 'U', 1]] })
    const variantId = product.variants[0]!.id
    const doc = (await preview()).body
    const body = {
      entryDate: '2026-11-01',
      supplierName: doc.supplier.name,
      reference: `NF-e ${doc.number}`,
      items: [{ variantId, quantity: 1, unitCostCents: 4000 }],
      nfe: {
        accessKey: doc.accessKey,
        supplierDocument: doc.supplier.document,
        links: [{ supplierCode: 'XX-99', variantId }],
      },
    }
    const res = await request('POST', '/stock/entries', {
      cookie,
      body,
      headers: { 'idempotency-key': crypto.randomUUID() },
    })
    expect(res.status).toBe(201)
    expect((await services.products.getVariant(variantId)).stockQty).toBe(2)

    // mesma nota outra vez: a prévia já avisa e o lançamento recusa
    const again = await preview()
    expect(again.status).toBe(409)
    expect(again.body.error.message).toContain('já foi lançada')
    const dup = await request('POST', '/stock/entries', {
      cookie,
      body,
      headers: { 'idempotency-key': crypto.randomUUID() },
    })
    expect(dup.status).toBe(409)

    // próxima nota do mesmo fornecedor: o item XX-99 já vem casado pelo vínculo
    const next = (await preview(xml.replaceAll('1000012345', '1000099999'))).body
    expect(next.items[2].match).toMatchObject({ variantId, by: 'link' })
  })

  test('arquivo que não é NF-e é recusado com mensagem clara', async () => {
    const res = await preview('<html>oi</html>')
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('não é de uma NF-e')
  })
})

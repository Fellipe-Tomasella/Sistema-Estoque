import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { stockMovements } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string
let userId: string

beforeEach(async () => {
  await resetDatabase()
  ;({
    cookie,
    user: { id: userId },
  } = await loggedIn())
})

function upload(content: string | ArrayBuffer, fileName = 'estoque.csv') {
  const form = new FormData()
  form.append('file', new File([content], fileName))
  return request('POST', '/stock/import/preview', { cookie, body: form })
}

const commit = (batchId: string, skipErrorRows = false) =>
  request('POST', `/stock/import/${batchId}/commit`, { cookie, body: { skipErrorRows } })

// Fixture com erros: linha 4 preço inválido, 5 quantidade negativa, 6 cor vazia, 7 repetida da linha 2.
const CSV_WITH_ERRORS = [
  'Produto*;Cor*;Tamanho*;Preço*;Quantidade*;alerta_minimo;categoria',
  'Blusa Básica;Preta;M;49,90;3;1;Blusas',
  'blusa basica;Preta;G;49,90;2;;Blusas',
  'Blusa básica;Branca;M;abc;1;;',
  'Calça;Azul;38;120;-1;;',
  'Calça;;40;120;1;;',
  'BLUSA BÁSICA;preta;m;49,90;1;;',
  'Blusa básica;Branca;GG;59,90;4;;',
  'Calça jeans;Azul;38;120.00;5;;Calças',
].join('\n')

describe('RN-IMP prévia', () => {
  test('RN-IMP-02 prévia não grava estoque e lista erros por linha', async () => {
    const res = await upload(CSV_WITH_ERRORS)
    expect(res.status).toBe(200)
    expect(res.body.errors).toEqual([
      { line: 4, message: 'Preço inválido' },
      { line: 5, message: 'Quantidade negativa' },
      { line: 6, message: 'Cor vazia' },
      { line: 7, message: 'Linha repetida (mesma peça da linha 2)' },
    ])
    expect(res.body.summary).toMatchObject({ totalRows: 8, errorRows: 4, productsToCreate: 2, variants: 4, units: 14 })
    expect(await db.select().from(stockMovements)).toHaveLength(0)
  })

  test('RN-IMP-03 mesmo produto sem diferenciar maiúsculas/acentos; preço base = o mais frequente', async () => {
    const res = await upload(CSV_WITH_ERRORS)
    const blusa = res.body.groups.find((g: { name: string }) => g.name === 'Blusa Básica')
    expect(blusa.basePriceCents).toBe(4990)
    expect(blusa.variants.map((v: { size: string; priceCents: number | null }) => [v.size, v.priceCents])).toEqual([
      ['M', null],
      ['G', null],
      ['GG', 5990],
    ])
  })

  test('arquivo sem colunas obrigatórias é recusado', async () => {
    const res = await upload('produto;cor\nBlusa;Preta')
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('tamanho, preco, quantidade')
  })

  test('outros formatos são recusados', async () => {
    expect((await upload('x', 'estoque.pdf')).status).toBe(400)
  })
})

describe('RN-IMP efetivar', () => {
  test('RN-IMP-05 com erros, só efetiva se a dona optar por ignorar as linhas com erro', async () => {
    const preview = await upload(CSV_WITH_ERRORS)
    const blocked = await commit(preview.body.batchId)
    expect(blocked.status).toBe(422)
    expect(blocked.body.error.message).toContain('4 linhas com erro')

    const done = await commit(preview.body.batchId, true)
    expect(done.body).toMatchObject({ productsCreated: 2, variantsCreated: 4, units: 14, skippedRows: 4 })

    const products = await services.products.list({ status: 'all' })
    expect(products.items.map((p) => [p.name, p.totalStock])).toEqual([
      ['Blusa Básica', 9],
      ['Calça jeans', 5],
    ])
    const movements = await db.select().from(stockMovements)
    expect(movements.every((m) => m.type === 'initial' && m.refType === 'import')).toBe(true)
  })

  test('RN-IMP-05 efetivar de novo devolve o resultado já gravado, sem duplicar', async () => {
    const preview = await upload('produto;cor;tamanho;preco;quantidade\nSaia;Rosa;P;30;2')
    await commit(preview.body.batchId)
    const again = await commit(preview.body.batchId)
    expect(again.body).toMatchObject({ alreadyProcessed: true, units: 2 })
    expect(await db.select().from(stockMovements)).toHaveLength(1)
  })

  test('RN-IMP-04 produto existente recebe novas variações; variação existente vira erro', async () => {
    const existing = await createProduct(userId, { name: 'Saia', basePriceCents: 3000, variants: [['Rosa', 'P', 1]] })
    const preview = await upload('produto;cor;tamanho;preco;quantidade\nSAIA;rosa;p;30;5\nSaia;Rosa;M;35;2')
    expect(preview.body.errors).toEqual([{ line: 2, message: 'Variação já cadastrada — use entrada ou acerto' }])
    expect(preview.body.summary).toMatchObject({ productsToUpdate: 1, productsToCreate: 0 })

    await commit(preview.body.batchId, true)
    const product = await services.products.get(existing.id)
    expect(product.variants.map((v) => [v.size, v.stockQty, v.effectivePriceCents])).toEqual([
      ['P', 1, 3000],
      ['M', 2, 3500],
    ])
  })

  test('variação criada entre a prévia e a efetivação bloqueia a importação', async () => {
    const preview = await upload('produto;cor;tamanho;preco;quantidade\nSaia;Rosa;P;30;2')
    await createProduct(userId, { name: 'Saia', variants: [['Rosa', 'P', 1]] })
    const res = await commit(preview.body.batchId)
    expect(res.status).toBe(409)
  })

  test('descartar impede efetivar', async () => {
    const preview = await upload('produto;cor;tamanho;preco;quantidade\nSaia;Rosa;P;30;2')
    await request('POST', `/stock/import/${preview.body.batchId}/discard`, { cookie })
    expect((await commit(preview.body.batchId)).status).toBe(422)
  })
})

test('RN-IMP-01 modelo .xlsx baixado é aceito de volta na importação', async () => {
  const template = await request('GET', '/stock/import/template', { cookie })
  expect(template.headers.get('content-type')).toContain('spreadsheetml')
  const res = await upload(await template.response.arrayBuffer(), 'modelo.xlsx')
  expect(res.body.errors).toEqual([])
  expect(res.body.summary).toMatchObject({ productsToCreate: 1, variants: 2, units: 5 })

  await commit(res.body.batchId)
  const [movement] = await db.select().from(stockMovements).where(eq(stockMovements.refId, res.body.batchId))
  expect(movement?.type).toBe('initial')
})

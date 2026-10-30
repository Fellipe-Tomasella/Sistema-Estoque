import { beforeEach, expect, test } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { resetDatabase } from '../../../test/db'
import { createConfirmedSale, createCustomer, loggedIn } from '../../../test/factories'
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

test('RN-ACE-04 exportação ZIP com os CSVs dos cadastros e registros, sem dados de acesso', async () => {
  const maria = await createCustomer('Maria Conceição')
  await createConfirmedSale(userId, { totalCents: 5000, customerId: maria.id, fiado: true })

  const res = await request('GET', '/exports/full.zip', { cookie })
  expect(res.headers.get('content-type')).toBe('application/zip')
  const files = unzipSync(new Uint8Array(await res.response.arrayBuffer()))

  expect(Object.keys(files)).toContain('vendas.csv')
  expect(Object.keys(files).some((name) => name.includes('usuario') || name.includes('sess'))).toBe(false)
  expect(strFromU8(files['clientes.csv']!)).toContain('Maria Conceição')
  expect(strFromU8(files['dividas.csv']!)).toContain('5000')
})

test('exportação exige login', async () => {
  expect((await request('GET', '/exports/full.zip')).status).toBe(401)
})

import { beforeEach, describe, expect, test } from 'bun:test'
import { resetDatabase } from '../../../test/db'
import { loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

let cookie: string

beforeEach(async () => {
  await resetDatabase()
  ;({ cookie } = await loggedIn())
})

const create = (body: unknown) => request('POST', '/customers', { cookie, body })

describe('clientes', () => {
  test('RN-CLI-01 / RN-CLI-04 cadastro mínimo só com nome (e cadastro rápido com telefone)', async () => {
    const res = await create({ name: '  Maria   Souza ', phone: '(65) 99999-0001' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'Maria Souza',
      phone: '(65) 99999-0001',
      document: null,
      active: true,
      label: 'Maria Souza · (65) 99999-0001',
    })
  })

  test('RN-CLI-02 duas “Maria” convivem e são distinguíveis na lista e na busca', async () => {
    const a = await create({ name: 'Maria', phone: '(65) 99999-0001' })
    const b = await create({ name: 'Maria', phone: '(65) 98888-0002' })
    expect(a.body.id).not.toBe(b.body.id)

    const list = await request('GET', '/customers?q=maria', { cookie })
    expect(list.body.items.map((c: { label: string }) => c.label).sort()).toEqual([
      'Maria · (65) 98888-0002',
      'Maria · (65) 99999-0001',
    ])
  })

  test('busca por telefone ignora a formatação', async () => {
    await create({ name: 'Ana', phone: '(65) 99999-0001' })
    await create({ name: 'Bia', phone: '(65) 98888-0002' })
    const res = await request('GET', '/customers?q=99999', { cookie })
    expect(res.body.items.map((c: { name: string }) => c.name)).toEqual(['Ana'])
    // número inteiro, sem a pontuação do cadastro
    const full = await request('GET', '/customers?q=65999990001', { cookie })
    expect(full.body.items.map((c: { name: string }) => c.name)).toEqual(['Ana'])
  })

  test('busca por nome sem acento', async () => {
    await create({ name: 'Joana Conceição' })
    const res = await request('GET', '/customers?q=conceicao', { cookie })
    expect(res.body.total).toBe(1)
  })

  test('RN-CLI-03 CPF e CNPJ validados, tipo deduzido e gravado só com dígitos', async () => {
    const cpf = await create({ name: 'Ana', document: '529.982.247-25' })
    expect(cpf.body).toMatchObject({ document: '52998224725', documentType: 'cpf' })
    const cnpj = await create({ name: 'Loja X', document: '11.222.333/0001-81' })
    expect(cnpj.body).toMatchObject({ document: '11222333000181', documentType: 'cnpj' })

    const invalid = await create({ name: 'Bia', document: '529.982.247-24' })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.message).toBe('CPF inválido.')
  })

  test('RN-CLI-03 CPF/CNPJ não pode repetir entre clientes', async () => {
    await create({ name: 'Ana', document: '52998224725' })
    const res = await create({ name: 'Ana 2', document: '529.982.247-25' })
    expect(res.status).toBe(409)
  })

  test('endereço opcional, normalizado e com UF validada', async () => {
    const ok = await create({ name: 'Ana', address: { zip: '78000-000', city: ' Cuiabá ', uf: 'mt' } })
    expect(ok.body.address).toMatchObject({ zip: '78000000', city: 'Cuiabá', uf: 'MT' })
    const bad = await create({ name: 'Bia', address: { uf: 'ZZ' } })
    expect(bad.status).toBe(400)
  })

  test('editar mantém o que não foi enviado e permite limpar campo', async () => {
    const { body } = await create({ name: 'Ana', phone: '1', email: 'ANA@X.COM', document: '52998224725' })
    const res = await request('PATCH', `/customers/${body.id}`, { cookie, body: { phone: null } })
    expect(res.body).toMatchObject({ name: 'Ana', phone: null, email: 'ana@x.com', document: '52998224725' })
  })

  test('RN-CLI-05 cliente não é excluído, só inativado (e some da lista padrão)', async () => {
    const { body } = await create({ name: 'Ana' })
    expect((await request('DELETE', `/customers/${body.id}`, { cookie })).status).toBe(404)

    await request('POST', `/customers/${body.id}/deactivate`, { cookie })
    expect((await request('GET', '/customers', { cookie })).body.total).toBe(0)
    expect((await request('GET', '/customers?status=inactive', { cookie })).body.total).toBe(1)
    expect((await request('GET', `/customers/${body.id}`, { cookie })).body.active).toBe(false)
  })
})

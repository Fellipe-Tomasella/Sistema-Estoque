import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { auditLog } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

beforeEach(resetDatabase)

describe('configurações da loja', () => {
  test('primeira leitura devolve os padrões (MEI, fuso de São Paulo, regras fiscais não validadas)', async () => {
    const { cookie } = await loggedIn()
    const res = await request('GET', '/settings/store', { cookie })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      storeName: 'Minha loja',
      timezone: 'America/Sao_Paulo',
      taxRegime: 'mei',
      fiscalRulesValidated: false,
    })
  })

  test('exige login', async () => {
    expect((await request('GET', '/settings/store')).status).toBe(401)
  })

  test('atualiza, normaliza e registra no audit_log', async () => {
    const { cookie } = await loggedIn()
    const res = await request('PUT', '/settings/store', {
      cookie,
      body: {
        storeName: '  Loja da Ana ',
        uf: 'mt',
        cnpj: '11.222.333/0001-81',
        timezone: 'America/Cuiaba',
        phone: ' ',
      },
    })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      storeName: 'Loja da Ana',
      uf: 'MT',
      cnpj: '11222333000181',
      timezone: 'America/Cuiaba',
      phone: null,
    })
    const entries = await db.select().from(auditLog).where(eq(auditLog.entity, 'store_settings'))
    expect(entries).toHaveLength(1)
  })

  test.each([
    [{ uf: 'XX' }, 'UF inválida.'],
    [{ cnpj: '11.222.333/0001-80' }, 'CNPJ inválido.'],
    [{ timezone: 'Marte/Base' }, 'Fuso horário inválido.'],
  ])('recusa dado inválido %o', async (body, message) => {
    const { cookie } = await loggedIn()
    const res = await request('PUT', '/settings/store', { cookie, body })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe(message)
  })

  test('campo não enviado não é alterado', async () => {
    const { cookie } = await loggedIn()
    await request('PUT', '/settings/store', { cookie, body: { taxRegime: 'simples' } })
    const res = await request('PUT', '/settings/store', { cookie, body: { city: 'Cuiabá' } })
    expect(res.body).toMatchObject({ taxRegime: 'simples', city: 'Cuiabá' })
  })

  test('business_date usa o fuso configurado', async () => {
    const { user } = await loggedIn()
    await services.settings.update({ timezone: 'America/Sao_Paulo' }, user.id)
    expect(await services.settings.businessDate(new Date('2026-10-31T02:30:00Z'))).toBe('2026-10-30')
  })
})

import { describe, expect, test } from 'bun:test'
import { request } from '../../../test/http'

describe('GET /api/health', () => {
  test('responde ok com o banco acessível', async () => {
    const res = await request('GET', '/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, db: true })
  })

  test('rota inexistente devolve erro padrão em pt-BR', async () => {
    const res = await request('GET', '/nao-existe')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Rota não encontrada.' })
  })
})

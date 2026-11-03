import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { auditLog, sessions } from '../../db/schema'
import { services } from '../../container'
import type { MemoryMailer } from '../../shared/mailer'
import { resetDatabase } from '../../../test/db'
import { createUser, DEFAULT_PASSWORD, loggedIn } from '../../../test/factories'
import { request } from '../../../test/http'

const mailer = services.mailer as MemoryMailer

beforeEach(async () => {
  await resetDatabase()
  mailer.outbox.length = 0
})

describe('RN-ACE-01 tudo exige login', () => {
  test('rota protegida sem sessão devolve 401', async () => {
    const res = await request('GET', '/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  test('health é público', async () => {
    expect((await request('GET', '/health')).status).toBe(200)
  })
})

describe('login', () => {
  test('com e-mail e senha corretos cria sessão e cookie seguro', async () => {
    const user = await createUser({ email: 'Maria@Loja.com' })
    const res = await request('POST', '/auth/login', { body: { email: 'maria@loja.com', password: DEFAULT_PASSWORD } })

    expect(res.status).toBe(200)
    expect(res.body.user).toEqual(user)
    const setCookie = res.headers.getSetCookie().join(';')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')

    const me = await request('GET', '/auth/me', { cookie: res.sessionCookie })
    expect(me.body.user.email).toBe('maria@loja.com')
  })

  test('o banco guarda só o hash do token', async () => {
    const { cookie } = await loggedIn()
    const token = cookie.split('=')[1]!
    const [session] = await db.select().from(sessions)
    expect(session!.tokenHash).not.toBe(token)
  })

  test('senha errada devolve mensagem genérica', async () => {
    const user = await createUser()
    const res = await request('POST', '/auth/login', { body: { email: user.email, password: 'errada-123' } })
    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('E-mail ou senha incorretos.')
  })

  test('5 tentativas erradas bloqueiam por 15 minutos, mesmo com a senha certa', async () => {
    const user = await createUser()
    const headers = { 'x-real-ip': '10.0.0.5' }
    for (let i = 0; i < 5; i++) {
      await request('POST', '/auth/login', { body: { email: user.email, password: 'errada-123' }, headers })
    }
    const res = await request('POST', '/auth/login', {
      body: { email: user.email, password: DEFAULT_PASSWORD },
      headers,
    })
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('TOO_MANY_ATTEMPTS')
  })

  test('login fica registrado no audit_log', async () => {
    const { user } = await loggedIn()
    const entries = await db.select().from(auditLog).where(eq(auditLog.entityId, user.id))
    expect(entries.map((e) => e.action)).toContain('login')
  })
})

describe('sessões', () => {
  test('logout encerra só a sessão atual', async () => {
    const { user } = await loggedIn()
    const other = await request('POST', '/auth/login', { body: { email: user.email, password: DEFAULT_PASSWORD } })
    const current = await request('POST', '/auth/login', { body: { email: user.email, password: DEFAULT_PASSWORD } })

    expect((await request('POST', '/auth/logout', { cookie: current.sessionCookie })).status).toBe(200)
    expect((await request('GET', '/auth/me', { cookie: current.sessionCookie })).status).toBe(401)
    expect((await request('GET', '/auth/me', { cookie: other.sessionCookie })).status).toBe(200)
  })

  test('RN-ACE-03 sair de todos os aparelhos', async () => {
    const { user, cookie } = await loggedIn()
    const phone = await request('POST', '/auth/login', { body: { email: user.email, password: DEFAULT_PASSWORD } })

    await request('POST', '/auth/logout-all', { cookie })
    expect((await request('GET', '/auth/me', { cookie })).status).toBe(401)
    expect((await request('GET', '/auth/me', { cookie: phone.sessionCookie })).status).toBe(401)
  })

  test('sessão expirada não vale', async () => {
    const { cookie } = await loggedIn()
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) })
    expect((await request('GET', '/auth/me', { cookie })).status).toBe(401)
  })
})

describe('origem (CSRF)', () => {
  test('escrita com Origin de outro site é recusada', async () => {
    const user = await createUser()
    const res = await request('POST', '/auth/login', {
      body: { email: user.email, password: DEFAULT_PASSWORD },
      headers: { origin: 'https://site-malicioso.com' },
    })
    expect(res.status).toBe(403)
  })

  test('escrita com o Origin do sistema passa', async () => {
    const user = await createUser()
    const res = await request('POST', '/auth/login', {
      body: { email: user.email, password: DEFAULT_PASSWORD },
      headers: { origin: process.env.APP_ORIGIN! },
    })
    expect(res.status).toBe(200)
  })
})

describe('RN-ACE-02 recuperação de acesso', () => {
  test('esqueci a senha não revela se o e-mail existe', async () => {
    const res = await request('POST', '/auth/forgot-password', { body: { email: 'ninguem@teste.com' } })
    expect(res.status).toBe(200)
    expect(mailer.outbox).toHaveLength(0)
  })

  test('link do e-mail redefine a senha uma única vez e derruba as sessões', async () => {
    const { user, cookie } = await loggedIn()
    await request('POST', '/auth/forgot-password', { body: { email: user.email } })
    const token = mailer.outbox[0]!.text.match(/token=([\w-]+)/)![1]!

    const reset = await request('POST', '/auth/reset-password', { body: { token, password: 'nova-senha-456' } })
    expect(reset.status).toBe(200)
    expect((await request('GET', '/auth/me', { cookie })).status).toBe(401)

    const again = await request('POST', '/auth/reset-password', { body: { token, password: 'outra-senha-789' } })
    expect(again.status).toBe(400)

    const login = await request('POST', '/auth/login', { body: { email: user.email, password: 'nova-senha-456' } })
    expect(login.status).toBe(200)
  })

  test('redefinição pelo script do servidor', async () => {
    const { user, cookie } = await loggedIn()
    await services.auth.setPasswordByEmail(user.email, 'pelo-servidor-1')
    expect((await request('GET', '/auth/me', { cookie })).status).toBe(401)
    const login = await request('POST', '/auth/login', { body: { email: user.email, password: 'pelo-servidor-1' } })
    expect(login.status).toBe(200)
  })
})

describe('alterar senha', () => {
  test('exige a senha atual e mantém só a sessão atual', async () => {
    const { user, cookie } = await loggedIn()
    const phone = await request('POST', '/auth/login', { body: { email: user.email, password: DEFAULT_PASSWORD } })

    const wrong = await request('POST', '/auth/change-password', {
      cookie,
      body: { current: 'errada-123', next: 'nova-senha-456' },
    })
    expect(wrong.status).toBe(400)

    const ok = await request('POST', '/auth/change-password', {
      cookie,
      body: { current: DEFAULT_PASSWORD, next: 'nova-senha-456' },
    })
    expect(ok.status).toBe(200)
    expect((await request('GET', '/auth/me', { cookie })).status).toBe(200)
    expect((await request('GET', '/auth/me', { cookie: phone.sessionCookie })).status).toBe(401)
  })

  test('senha curta é recusada', async () => {
    const { cookie } = await loggedIn()
    const res = await request('POST', '/auth/change-password', {
      cookie,
      body: { current: DEFAULT_PASSWORD, next: '123' },
    })
    expect(res.status).toBe(400)
  })
})

describe('primeira conta pelo deploy (FIRST_USER_*)', () => {
  const first = { name: 'Dona', email: 'Dona@Loja.com', password: 'senha-provisoria-1' }

  test('cria só com o banco vazio e entra com a senha informada', async () => {
    const user = await services.auth.ensureFirstUser(first)
    expect(user?.email).toBe('dona@loja.com')
    const res = await request('POST', '/auth/login', { body: { email: first.email, password: first.password } })
    expect(res.status).toBe(200)
  })

  test('com conta já existente não faz nada (restart não desfaz troca de senha)', async () => {
    await createUser()
    expect(await services.auth.ensureFirstUser(first)).toBeNull()
  })

  test('sem as três variáveis não cria nada', async () => {
    expect(await services.auth.ensureFirstUser({ name: 'Dona', email: first.email })).toBeNull()
  })
})

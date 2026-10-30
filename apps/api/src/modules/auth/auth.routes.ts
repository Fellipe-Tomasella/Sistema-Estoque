import { Elysia } from 'elysia'
import { env } from '../../config/env'
import { SESSION_COOKIE, authPlugin } from '../../shared/auth.plugin'
import { clientInfo } from '../../shared/client-info'
import { ChangePasswordBody, ForgotPasswordBody, LoginBody, ResetPasswordBody } from './auth.schemas'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authPlugin)
  .post(
    '/login',
    async ({ body, services, cookie, request, server }) => {
      const { user, token } = await services.auth.login(body, clientInfo(request, server))
      cookie[SESSION_COOKIE]!.set({
        value: token,
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: services.auth.sessionTtlSeconds,
      })
      return { user }
    },
    { body: LoginBody },
  )
  .post(
    '/logout',
    async ({ services, session, cookie }) => {
      await services.auth.logout(session.id)
      cookie[SESSION_COOKIE]!.remove()
      return { ok: true }
    },
    { auth: true },
  )
  .post(
    '/logout-all',
    async ({ services, user, cookie }) => {
      await services.auth.logoutAll(user.id)
      cookie[SESSION_COOKIE]!.remove()
      return { ok: true }
    },
    { auth: true },
  )
  .get('/me', ({ user }) => ({ user }), { auth: true })
  .post(
    '/forgot-password',
    async ({ body, services }) => {
      await services.auth.requestPasswordReset(body.email)
      return { ok: true }
    },
    { body: ForgotPasswordBody },
  )
  .post(
    '/reset-password',
    async ({ body, services }) => {
      await services.auth.resetPassword(body.token, body.password)
      return { ok: true }
    },
    { body: ResetPasswordBody },
  )
  .post(
    '/change-password',
    async ({ body, services, user, session }) => {
      await services.auth.changePassword({ user, session }, body.current, body.next)
      return { ok: true }
    },
    { auth: true, body: ChangePasswordBody },
  )

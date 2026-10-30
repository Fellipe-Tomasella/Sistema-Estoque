import { Elysia } from 'elysia'
import { UnauthorizedError } from './errors'
import { servicesPlugin } from './services.plugin'

export const SESSION_COOKIE = 'sid'

/**
 * `{ auth: true }` numa rota exige sessão válida e coloca `user` e `session` no contexto.
 * Tudo exige login, exceto login, recuperação de senha e health (RN-ACE-01).
 */
export const authPlugin = new Elysia({ name: 'auth' }).use(servicesPlugin).macro({
  auth: {
    async resolve({ cookie, services }) {
      const result = await services.auth.authenticate(cookie[SESSION_COOKIE]?.value as string | undefined)
      if (!result) throw new UnauthorizedError()
      return { user: result.user, session: result.session }
    },
  },
})

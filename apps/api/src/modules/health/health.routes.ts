import { Elysia, t } from 'elysia'
import { servicesPlugin } from '../../shared/services.plugin'

export const healthRoutes = new Elysia({ prefix: '/health' }).use(servicesPlugin).get(
  '/',
  async ({ services, set }) => {
    const result = await services.health.check()
    if (!result.ok) set.status = 503
    return result
  },
  {
    response: {
      200: t.Object({ ok: t.Boolean(), db: t.Boolean(), media: t.Boolean(), version: t.String() }),
      503: t.Any(),
    },
  },
)

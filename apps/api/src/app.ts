import { Elysia } from 'elysia'
import { healthRoutes } from './modules/health/health.routes'
import { errorHandler } from './shared/error-handler'

export function createApp() {
  return new Elysia({ prefix: '/api' }).use(errorHandler).use(healthRoutes)
}

/** Tipo consumido pelo Eden Treaty no front. */
export type App = ReturnType<typeof createApp>

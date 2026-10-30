import { Elysia } from 'elysia'
import { authRoutes } from './modules/auth/auth.routes'
import { healthRoutes } from './modules/health/health.routes'
import { productsRoutes } from './modules/products/products.routes'
import { variantsRoutes } from './modules/products/variants.routes'
import { settingsRoutes } from './modules/settings/settings.routes'
import { errorHandler } from './shared/error-handler'
import { originCheck } from './shared/origin-check.plugin'

export function createApp() {
  return new Elysia({ prefix: '/api' })
    .use(errorHandler)
    .use(originCheck)
    .use(healthRoutes)
    .use(authRoutes)
    .use(settingsRoutes)
    .use(productsRoutes)
    .use(variantsRoutes)
}

/** Tipo consumido pelo Eden Treaty no front. */
export type App = ReturnType<typeof createApp>

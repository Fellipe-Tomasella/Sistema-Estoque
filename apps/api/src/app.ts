import { Elysia } from 'elysia'
import { authRoutes } from './modules/auth/auth.routes'
import { customersRoutes } from './modules/customers/customers.routes'
import { healthRoutes } from './modules/health/health.routes'
import { importsRoutes } from './modules/imports/imports.routes'
import { productsRoutes } from './modules/products/products.routes'
import { variantsRoutes } from './modules/products/variants.routes'
import { receivablesRoutes } from './modules/receivables/receivables.routes'
import { salesRoutes } from './modules/sales/sales.routes'
import { settingsRoutes } from './modules/settings/settings.routes'
import { stockRoutes } from './modules/stock/stock.routes'
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
    .use(stockRoutes)
    .use(importsRoutes)
    .use(customersRoutes)
    .use(salesRoutes)
    .use(receivablesRoutes)
}

/** Tipo consumido pelo Eden Treaty no front. */
export type App = ReturnType<typeof createApp>

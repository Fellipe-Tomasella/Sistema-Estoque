import { Elysia } from 'elysia'
import { authRoutes } from './modules/auth/auth.routes'
import { customersRoutes } from './modules/customers/customers.routes'
import { exportsRoutes } from './modules/exports/exports.routes'
import { fiscalRoutes } from './modules/fiscal/fiscal.routes'
import { healthRoutes } from './modules/health/health.routes'
import { importsRoutes } from './modules/imports/imports.routes'
import { mediaRoutes } from './modules/products/media.routes'
import { productsRoutes } from './modules/products/products.routes'
import { variantsRoutes } from './modules/products/variants.routes'
import { receivablesRoutes } from './modules/receivables/receivables.routes'
import { reportsRoutes } from './modules/reports/reports.routes'
import { returnsRoutes } from './modules/returns/returns.routes'
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
    .use(mediaRoutes)
    .use(productsRoutes)
    .use(variantsRoutes)
    .use(stockRoutes)
    .use(importsRoutes)
    .use(customersRoutes)
    .use(salesRoutes)
    .use(receivablesRoutes)
    .use(returnsRoutes)
    .use(reportsRoutes)
    .use(fiscalRoutes)
    .use(exportsRoutes)
}

/** Tipo consumido pelo Eden Treaty no front. */
export type App = ReturnType<typeof createApp>

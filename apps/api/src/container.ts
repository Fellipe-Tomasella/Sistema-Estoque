// Composição: cria repositories e services uma vez só. Sem framework de DI.
import pkg from '../package.json'
import { env } from './config/env'
import { db } from './db/client'
import { AuditRepository } from './modules/audit/audit.repository'
import { AuditService } from './modules/audit/audit.service'
import { AuthRepository } from './modules/auth/auth.repository'
import { AuthService } from './modules/auth/auth.service'
import { CancellationsService } from './modules/cancellations/cancellations.service'
import { CustomersRepository } from './modules/customers/customers.repository'
import { CustomersService } from './modules/customers/customers.service'
import { ExportsRepository } from './modules/exports/exports.repository'
import { ExportsService } from './modules/exports/exports.service'
import { FiscalRepository } from './modules/fiscal/fiscal.repository'
import { FiscalService } from './modules/fiscal/fiscal.service'
import { HealthRepository } from './modules/health/health.repository'
import { HealthService } from './modules/health/health.service'
import { ImportsRepository } from './modules/imports/imports.repository'
import { ImportsService } from './modules/imports/imports.service'
import { IntegrityRepository } from './modules/integrity/integrity.repository'
import { IntegrityService } from './modules/integrity/integrity.service'
import { PaymentsRepository } from './modules/payments/payments.repository'
import { ProductsRepository } from './modules/products/products.repository'
import { ProductImagesService } from './modules/products/product-images.service'
import { ProductsService } from './modules/products/products.service'
import { ReceivableReceiptsService } from './modules/receivables/receivable-receipts.service'
import { ReceivablesRepository } from './modules/receivables/receivables.repository'
import { ReceivablesService } from './modules/receivables/receivables.service'
import { ReceiptsService } from './modules/receipts/receipts.service'
import { PartialReturnsService } from './modules/returns/partial-returns.service'
import { ClosingsRepository } from './modules/reports/closings.repository'
import { ClosingsService } from './modules/reports/closings.service'
import { DashboardRepository } from './modules/reports/dashboard.repository'
import { DashboardService } from './modules/reports/dashboard.service'
import { ReportsRepository } from './modules/reports/reports.repository'
import { ReportsService } from './modules/reports/reports.service'
import { RefundsRepository } from './modules/returns/refunds.repository'
import { RefundsService } from './modules/returns/refunds.service'
import { ReturnsRepository } from './modules/returns/returns.repository'
import { ReturnsService } from './modules/returns/returns.service'
import { SaleConfirmationService } from './modules/sales/sale-confirmation.service'
import { SaleDraftsService } from './modules/sales/sale-drafts.service'
import { SalesRepository } from './modules/sales/sales.repository'
import { SalesService } from './modules/sales/sales.service'
import { SettingsRepository } from './modules/settings/settings.repository'
import { SettingsService } from './modules/settings/settings.service'
import { StockAdjustmentsService } from './modules/stock/stock-adjustments.service'
import { StockEntriesRepository } from './modules/stock/stock-entries.repository'
import { StockEntriesService } from './modules/stock/stock-entries.service'
import { StockRepository } from './modules/stock/stock.repository'
import { StockService } from './modules/stock/stock.service'
import { StorefrontRepository } from './modules/storefront/storefront.repository'
import { StorefrontService } from './modules/storefront/storefront.service'
import { WebOrdersRepository } from './modules/web-orders/web-orders.repository'
import { WebOrdersService } from './modules/web-orders/web-orders.service'
import { createMailer } from './shared/mailer'
import { MediaStorage } from './shared/media-storage'

export function createContainer() {
  const mailer = createMailer()
  const media = new MediaStorage()
  const repositories = {
    audit: new AuditRepository(db),
    auth: new AuthRepository(db),
    closings: new ClosingsRepository(db),
    customers: new CustomersRepository(db),
    dashboard: new DashboardRepository(db),
    exports: new ExportsRepository(db),
    fiscal: new FiscalRepository(db),
    health: new HealthRepository(db),
    imports: new ImportsRepository(db),
    integrity: new IntegrityRepository(db),
    payments: new PaymentsRepository(db),
    products: new ProductsRepository(db),
    receivables: new ReceivablesRepository(db),
    refunds: new RefundsRepository(db),
    reports: new ReportsRepository(db),
    returns: new ReturnsRepository(db),
    sales: new SalesRepository(db),
    settings: new SettingsRepository(db),
    stock: new StockRepository(db),
    stockEntries: new StockEntriesRepository(db),
    storefront: new StorefrontRepository(db),
    webOrders: new WebOrdersRepository(db),
  }

  const audit = new AuditService(repositories.audit)
  const settings = new SettingsService(repositories.settings, audit)
  const stock = new StockService(repositories.stock)
  const products = new ProductsService(repositories.products, stock, settings, audit, media, repositories.webOrders)
  const customers = new CustomersService(repositories.customers, settings, audit)
  const sales = new SalesService(
    repositories.sales,
    repositories.payments,
    repositories.receivables,
    repositories.returns,
    repositories.refunds,
    repositories.fiscal,
    audit,
  )
  const fiscal = new FiscalService(repositories.fiscal, repositories.sales, settings, audit)
  const receivables = new ReceivablesService(
    repositories.receivables,
    repositories.payments,
    repositories.sales,
    customers,
    settings,
    audit,
  )
  const receivableReceipts = new ReceivableReceiptsService(
    repositories.receivables,
    receivables,
    repositories.payments,
    customers,
    settings,
    audit,
  )

  const saleConfirmation = new SaleConfirmationService(
    repositories.sales,
    sales,
    repositories.payments,
    repositories.receivables,
    stock,
    settings,
    customers,
    audit,
  )

  const saleDrafts = new SaleDraftsService(repositories.sales, sales, customers)

  return {
    mailer,
    media,
    audit,
    settings,
    stock,
    products,
    productImages: new ProductImagesService(repositories.products, media, audit),
    customers,
    sales,
    receivables,
    receivableReceipts,
    fiscal,
    auth: new AuthService(repositories.auth, audit, mailer, env.appOrigin),
    health: new HealthService(repositories.health, process.env.APP_VERSION ?? pkg.version, media),
    imports: new ImportsService(repositories.imports, products, audit),
    integrity: new IntegrityService(repositories.integrity),
    exports: new ExportsService(repositories.exports, settings, audit),
    cancellations: new CancellationsService(
      repositories.sales,
      sales,
      repositories.returns,
      repositories.refunds,
      repositories.receivables,
      receivables,
      stock,
      settings,
      fiscal,
      audit,
    ),
    returns: new ReturnsService(repositories.returns, stock, settings, audit),
    refunds: new RefundsService(repositories.refunds, settings, audit),
    reports: new ReportsService(repositories.reports, settings),
    closings: new ClosingsService(repositories.closings, settings, audit),
    dashboard: new DashboardService(repositories.dashboard, stock, settings),
    partialReturns: new PartialReturnsService(
      repositories.sales,
      sales,
      saleConfirmation,
      repositories.returns,
      repositories.refunds,
      repositories.receivables,
      receivables,
      stock,
      settings,
      audit,
    ),
    receipts: new ReceiptsService(sales, settings, receivableReceipts),
    saleConfirmation,
    saleDrafts,
    stockAdjustments: new StockAdjustmentsService(stock, settings, audit),
    stockEntries: new StockEntriesService(repositories.stockEntries, stock, settings),
    storefront: new StorefrontService(repositories.storefront, settings, audit),
    webOrders: new WebOrdersService(
      repositories.webOrders,
      repositories.storefront,
      customers,
      saleDrafts,
      settings,
      mailer,
      audit,
      env.appOrigin,
    ),
  }
}

export type Services = ReturnType<typeof createContainer>
/**
 * Congelado de propósito: o Elysia mescla (mergeDeep) o `decorate('services', …)` a cada `.use` e, como os
 * métodos de classe não são enumeráveis, percorria o grafo inteiro (até o cliente do banco) — ~3,5 s por grupo
 * de rotas, mais de 1 min para subir a API. Objeto congelado ele não percorre.
 */
export const services: Services = Object.freeze(createContainer())

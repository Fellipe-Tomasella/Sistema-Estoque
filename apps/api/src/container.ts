// Composição: cria repositories e services uma vez só. Sem framework de DI.
import pkg from '../package.json'
import { env } from './config/env'
import { db } from './db/client'
import { AuditRepository } from './modules/audit/audit.repository'
import { AuditService } from './modules/audit/audit.service'
import { AuthRepository } from './modules/auth/auth.repository'
import { AuthService } from './modules/auth/auth.service'
import { CustomersRepository } from './modules/customers/customers.repository'
import { CustomersService } from './modules/customers/customers.service'
import { HealthRepository } from './modules/health/health.repository'
import { HealthService } from './modules/health/health.service'
import { ImportsRepository } from './modules/imports/imports.repository'
import { ImportsService } from './modules/imports/imports.service'
import { IntegrityRepository } from './modules/integrity/integrity.repository'
import { IntegrityService } from './modules/integrity/integrity.service'
import { PaymentsRepository } from './modules/payments/payments.repository'
import { ProductsRepository } from './modules/products/products.repository'
import { ProductsService } from './modules/products/products.service'
import { ReceivableReceiptsService } from './modules/receivables/receivable-receipts.service'
import { ReceivablesRepository } from './modules/receivables/receivables.repository'
import { ReceivablesService } from './modules/receivables/receivables.service'
import { ReceiptsService } from './modules/receipts/receipts.service'
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
import { createMailer } from './shared/mailer'

export function createContainer() {
  const mailer = createMailer()
  const repositories = {
    audit: new AuditRepository(db),
    auth: new AuthRepository(db),
    customers: new CustomersRepository(db),
    health: new HealthRepository(db),
    imports: new ImportsRepository(db),
    integrity: new IntegrityRepository(db),
    payments: new PaymentsRepository(db),
    products: new ProductsRepository(db),
    receivables: new ReceivablesRepository(db),
    sales: new SalesRepository(db),
    settings: new SettingsRepository(db),
    stock: new StockRepository(db),
    stockEntries: new StockEntriesRepository(db),
  }

  const audit = new AuditService(repositories.audit)
  const settings = new SettingsService(repositories.settings, audit)
  const stock = new StockService(repositories.stock)
  const products = new ProductsService(repositories.products, stock, settings, audit)
  const customers = new CustomersService(repositories.customers, settings, audit)
  const sales = new SalesService(repositories.sales, repositories.payments, repositories.receivables, audit)
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

  return {
    mailer,
    audit,
    settings,
    stock,
    products,
    customers,
    sales,
    receivables,
    receivableReceipts,
    auth: new AuthService(repositories.auth, audit, mailer, env.appOrigin),
    health: new HealthService(repositories.health, pkg.version),
    imports: new ImportsService(repositories.imports, products, audit),
    integrity: new IntegrityService(repositories.integrity),
    receipts: new ReceiptsService(sales, settings, receivableReceipts),
    saleConfirmation: new SaleConfirmationService(
      repositories.sales,
      sales,
      repositories.payments,
      repositories.receivables,
      stock,
      settings,
      customers,
      audit,
    ),
    saleDrafts: new SaleDraftsService(repositories.sales, sales, customers),
    stockAdjustments: new StockAdjustmentsService(stock, settings, audit),
    stockEntries: new StockEntriesService(repositories.stockEntries, stock, settings),
  }
}

export type Services = ReturnType<typeof createContainer>
export const services = createContainer()

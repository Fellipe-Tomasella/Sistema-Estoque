// Composição: cria repositories e services uma vez só. Sem framework de DI.
import pkg from '../package.json'
import { env } from './config/env'
import { db } from './db/client'
import { AuditRepository } from './modules/audit/audit.repository'
import { AuditService } from './modules/audit/audit.service'
import { AuthRepository } from './modules/auth/auth.repository'
import { AuthService } from './modules/auth/auth.service'
import { HealthRepository } from './modules/health/health.repository'
import { HealthService } from './modules/health/health.service'
import { ImportsRepository } from './modules/imports/imports.repository'
import { ImportsService } from './modules/imports/imports.service'
import { IntegrityRepository } from './modules/integrity/integrity.repository'
import { IntegrityService } from './modules/integrity/integrity.service'
import { ProductsRepository } from './modules/products/products.repository'
import { ProductsService } from './modules/products/products.service'
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
    health: new HealthRepository(db),
    imports: new ImportsRepository(db),
    integrity: new IntegrityRepository(db),
    products: new ProductsRepository(db),
    settings: new SettingsRepository(db),
    stock: new StockRepository(db),
    stockEntries: new StockEntriesRepository(db),
  }

  const audit = new AuditService(repositories.audit)
  const settings = new SettingsService(repositories.settings, audit)
  const stock = new StockService(repositories.stock)
  const products = new ProductsService(repositories.products, stock, settings, audit)

  return {
    mailer,
    audit,
    settings,
    stock,
    products,
    auth: new AuthService(repositories.auth, audit, mailer, env.appOrigin),
    health: new HealthService(repositories.health, pkg.version),
    imports: new ImportsService(repositories.imports, products, audit),
    integrity: new IntegrityService(repositories.integrity),
    stockAdjustments: new StockAdjustmentsService(stock, settings, audit),
    stockEntries: new StockEntriesService(repositories.stockEntries, stock, settings),
  }
}

export type Services = ReturnType<typeof createContainer>
export const services = createContainer()

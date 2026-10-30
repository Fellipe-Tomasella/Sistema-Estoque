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
import { ProductsRepository } from './modules/products/products.repository'
import { ProductsService } from './modules/products/products.service'
import { SettingsRepository } from './modules/settings/settings.repository'
import { SettingsService } from './modules/settings/settings.service'
import { StockRepository } from './modules/stock/stock.repository'
import { StockService } from './modules/stock/stock.service'
import { createMailer } from './shared/mailer'

export function createContainer() {
  const mailer = createMailer()
  const repositories = {
    audit: new AuditRepository(db),
    auth: new AuthRepository(db),
    health: new HealthRepository(db),
    products: new ProductsRepository(db),
    settings: new SettingsRepository(db),
    stock: new StockRepository(db),
  }

  const audit = new AuditService(repositories.audit)
  const settings = new SettingsService(repositories.settings, audit)
  const stock = new StockService(repositories.stock)

  return {
    mailer,
    audit,
    settings,
    stock,
    auth: new AuthService(repositories.auth, audit, mailer, env.appOrigin),
    health: new HealthService(repositories.health, pkg.version),
    products: new ProductsService(repositories.products, stock, settings, audit),
  }
}

export type Services = ReturnType<typeof createContainer>
export const services = createContainer()

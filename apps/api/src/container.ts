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
import { SettingsRepository } from './modules/settings/settings.repository'
import { SettingsService } from './modules/settings/settings.service'
import { createMailer } from './shared/mailer'

export function createContainer() {
  const mailer = createMailer()
  const repositories = {
    audit: new AuditRepository(db),
    auth: new AuthRepository(db),
    health: new HealthRepository(db),
    settings: new SettingsRepository(db),
  }

  const audit = new AuditService(repositories.audit)

  return {
    mailer,
    audit,
    auth: new AuthService(repositories.auth, audit, mailer, env.appOrigin),
    health: new HealthService(repositories.health, pkg.version),
    settings: new SettingsService(repositories.settings, audit),
  }
}

export type Services = ReturnType<typeof createContainer>
export const services = createContainer()

// Composição: cria repositories e services uma vez só. Sem framework de DI.
import pkg from '../package.json'
import { db } from './db/client'
import { HealthRepository } from './modules/health/health.repository'
import { HealthService } from './modules/health/health.service'

export function createContainer() {
  const repositories = {
    health: new HealthRepository(db),
  }

  return {
    health: new HealthService(repositories.health, pkg.version),
  }
}

export type Services = ReturnType<typeof createContainer>
export const services = createContainer()

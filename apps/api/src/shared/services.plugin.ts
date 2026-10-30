import { Elysia } from 'elysia'
import { services } from '../container'

/** Disponibiliza `services` no contexto das rotas. Nomeado para ser aplicado uma vez só. */
export const servicesPlugin = new Elysia({ name: 'services' }).decorate('services', services)

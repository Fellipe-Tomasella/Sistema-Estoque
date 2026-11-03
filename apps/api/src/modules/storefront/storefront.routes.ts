import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { UpdateStorefrontBody } from './storefront.schemas'

/** Configuração da loja virtual no painel (Configurações → Loja virtual). */
export const storefrontRoutes = new Elysia({ prefix: '/storefront' })
  .use(authPlugin)
  .guard({ auth: true })
  .get('/settings', ({ services }) => services.storefront.getSettings())
  .put('/settings', ({ body, services, user }) => services.storefront.updateSettings(body, user.id), {
    body: UpdateStorefrontBody,
  })

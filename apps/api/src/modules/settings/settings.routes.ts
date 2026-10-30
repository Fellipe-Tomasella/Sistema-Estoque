import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { UpdateStoreSettingsBody } from './settings.schemas'

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .use(authPlugin)
  .get('/store', ({ services }) => services.settings.get(), { auth: true })
  .put('/store', ({ body, services, user }) => services.settings.update(body, user.id), {
    auth: true,
    body: UpdateStoreSettingsBody,
  })

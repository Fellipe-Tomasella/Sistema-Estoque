import { Elysia, t } from 'elysia'
import { NotFoundError } from '../../shared/errors'
import { servicesPlugin } from '../../shared/services.plugin'

/**
 * Fotos dos produtos, sem login: o site público também as usa. O nome tem o id (uuid v7) da foto e
 * nunca muda, então o cache é longo.
 */
export const mediaRoutes = new Elysia({ prefix: '/media' }).use(servicesPlugin).get(
  '/:name',
  async ({ params, services, set }) => {
    const file = services.media.file(params.name)
    if (!file || !(await file.exists())) throw new NotFoundError('Foto não encontrada.')
    set.headers['cache-control'] = 'public, max-age=31536000, immutable'
    set.headers['content-type'] = 'image/webp'
    return file
  },
  { params: t.Object({ name: t.String({ maxLength: 80 }) }) },
)

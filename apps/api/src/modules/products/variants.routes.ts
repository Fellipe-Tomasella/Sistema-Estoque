import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { IdParams, SearchVariantsQuery, UpdateVariantBody } from './products.schemas'

export const variantsRoutes = new Elysia({ prefix: '/variants' })
  .use(authPlugin)
  .guard({ auth: true })
  .get('/search', ({ query, services }) => services.products.searchVariants(query.q, query.limit), {
    query: SearchVariantsQuery,
  })
  .get('/:id', ({ params, services }) => services.products.getVariant(params.id), { params: IdParams })
  .patch('/:id', ({ params, body, services, user }) => services.products.updateVariant(params.id, body, user.id), {
    params: IdParams,
    body: UpdateVariantBody,
  })
  .delete(
    '/:id',
    async ({ params, services, user }) => {
      await services.products.removeVariant(params.id, user.id)
      return { ok: true }
    },
    { params: IdParams },
  )

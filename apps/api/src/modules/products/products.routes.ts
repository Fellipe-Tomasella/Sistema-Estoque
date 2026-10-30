import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import {
  AddVariantsBody,
  CreateProductBody,
  IdParams,
  ListProductsQuery,
  MinStockBody,
  UpdateProductBody,
} from './products.schemas'

export const productsRoutes = new Elysia({ prefix: '/products' })
  .use(authPlugin)
  .guard({ auth: true })
  .get('/', ({ query, services }) => services.products.list(query), { query: ListProductsQuery })
  .get('/suggestions', ({ services }) => services.products.suggestions())
  .get('/:id', ({ params, services }) => services.products.get(params.id), { params: IdParams })
  .post(
    '/',
    ({ body, services, user, set }) => {
      set.status = 201
      return services.products.create(body, user.id)
    },
    { body: CreateProductBody },
  )
  .patch('/:id', ({ params, body, services, user }) => services.products.update(params.id, body, user.id), {
    params: IdParams,
    body: UpdateProductBody,
  })
  .post(
    '/:id/variants',
    ({ params, body, services, user }) => services.products.addVariants(params.id, body.variants, user.id),
    { params: IdParams, body: AddVariantsBody },
  )
  .post('/:id/min-stock', ({ params, body, services }) => services.products.setMinStock(params.id, body.minStock), {
    params: IdParams,
    body: MinStockBody,
  })
  .post('/:id/deactivate', ({ params, services, user }) => services.products.setActive(params.id, false, user.id), {
    params: IdParams,
  })
  .post('/:id/activate', ({ params, services, user }) => services.products.setActive(params.id, true, user.id), {
    params: IdParams,
  })
  .delete(
    '/:id',
    async ({ params, services, user }) => {
      await services.products.remove(params.id, user.id)
      return { ok: true }
    },
    { params: IdParams },
  )

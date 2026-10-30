import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { CreateCustomerBody, IdParams, ListCustomersQuery, UpdateCustomerBody } from './customers.schemas'

export const customersRoutes = new Elysia({ prefix: '/customers' })
  .use(authPlugin)
  .guard({ auth: true })
  .get('/', ({ query, services }) => services.customers.list(query), { query: ListCustomersQuery })
  .get('/:id', ({ params, services }) => services.customers.get(params.id), { params: IdParams })
  .post(
    '/',
    ({ body, services, set }) => {
      set.status = 201
      return services.customers.create(body)
    },
    { body: CreateCustomerBody },
  )
  .patch('/:id', ({ params, body, services }) => services.customers.update(params.id, body), {
    params: IdParams,
    body: UpdateCustomerBody,
  })
  .post('/:id/deactivate', ({ params, services, user }) => services.customers.setActive(params.id, false, user.id), {
    params: IdParams,
  })
  .post('/:id/activate', ({ params, services, user }) => services.customers.setActive(params.id, true, user.id), {
    params: IdParams,
  })

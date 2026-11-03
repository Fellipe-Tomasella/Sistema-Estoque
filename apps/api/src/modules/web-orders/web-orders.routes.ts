import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { clientInfo } from '../../shared/client-info'
import { requireIdempotencyKey } from '../../shared/idempotency'
import { servicesPlugin } from '../../shared/services.plugin'
import { IdParams } from '../products/products.schemas'
import { CreateWebOrderBody, ListWebOrdersQuery, WebOrderStatusBody } from './web-orders.schemas'

/** Envio do pedido pelo site: sem login (RN-ACE-01), com Idempotency-Key e limite por IP (RN-LOJ-05). */
export const publicOrdersRoutes = new Elysia({ prefix: '/public' }).use(servicesPlugin).post(
  '/orders',
  ({ body, headers, request, server, services, set }) => {
    set.status = 201
    return services.webOrders.create(body, requireIdempotencyKey(headers), clientInfo(request, server).ip)
  },
  { body: CreateWebOrderBody },
)

/** Pedidos do site no painel. */
export const webOrdersRoutes = new Elysia({ prefix: '/web-orders' })
  .use(authPlugin)
  .guard({ auth: true })
  .get('/', ({ query, services }) => services.webOrders.list(query.status), { query: ListWebOrdersQuery })
  .get('/count', async ({ services }) => ({ new: await services.webOrders.countNew() }))
  .get('/:id', ({ params, services }) => services.webOrders.get(params.id), { params: IdParams })
  .post('/:id/status', ({ params, body, services, user }) => services.webOrders.setStatus(params.id, body, user.id), {
    params: IdParams,
    body: WebOrderStatusBody,
  })
  .post('/:id/convert', ({ params, services, user }) => services.webOrders.convert(params.id, user.id), {
    params: IdParams,
  })

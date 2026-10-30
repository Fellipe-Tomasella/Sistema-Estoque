import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import {
  CancelBody,
  CancelPreviewQuery,
  IdParams,
  ReasonBody,
  ReceiveItemBody,
  ReceiveItemParams,
  RefundDoneBody,
  RefundsQuery,
} from './returns.schemas'

/** Cancelamento, retorno físico de peças e devoluções de valor. */
export const returnsRoutes = new Elysia()
  .use(authPlugin)
  .guard({ auth: true })
  .get(
    '/sales/:id/cancel-preview',
    ({ params, query, services }) => services.cancellations.preview(params.id, query.itemsWithStore),
    { params: IdParams, query: CancelPreviewQuery },
  )
  .post(
    '/sales/:id/cancel',
    ({ params, body, services, user }) => services.cancellations.cancel(params.id, body, user.id),
    {
      params: IdParams,
      body: CancelBody,
    },
  )
  .get('/returns', ({ services }) => services.returns.awaiting())
  .post(
    '/returns/:id/items/:itemId/receive',
    ({ params, body, services, user }) =>
      services.returns.receiveItem(params.id, params.itemId, body.condition, user.id),
    { params: ReceiveItemParams, body: ReceiveItemBody },
  )
  .get('/refunds', ({ query, services }) => services.refunds.list(query.status), { query: RefundsQuery })
  .post(
    '/refunds/:id/done',
    ({ params, body, services, user }) => services.refunds.markDone(params.id, body, user.id),
    {
      params: IdParams,
      body: RefundDoneBody,
    },
  )
  .post(
    '/refunds/:id/cancel',
    ({ params, body, services, user }) => services.refunds.cancel(params.id, body.reason, user.id),
    { params: IdParams, body: ReasonBody },
  )

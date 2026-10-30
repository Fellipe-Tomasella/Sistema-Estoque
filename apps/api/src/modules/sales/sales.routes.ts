import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import {
  ChangePaymentMethodBody,
  IdParams,
  ListSalesQuery,
  NotesBody,
  PaymentParams,
  UpdateDraftBody,
  UpdateShippingBody,
} from './sales.schemas'

export const salesRoutes = new Elysia({ prefix: '/sales' })
  .use(authPlugin)
  .guard({ auth: true })
  .post('/', async ({ services, user, set }) => {
    set.status = 201
    return services.saleDrafts.create(user.id)
  })
  .get('/', ({ query, services }) => services.sales.list(query), { query: ListSalesQuery })
  .get('/drafts', ({ services }) => services.sales.drafts())
  .get('/:id', ({ params, services }) => services.sales.view(params.id), { params: IdParams })
  .patch('/:id', ({ params, body, services }) => services.saleDrafts.update(params.id, body), {
    params: IdParams,
    body: UpdateDraftBody,
  })
  .delete(
    '/:id',
    async ({ params, services }) => {
      await services.saleDrafts.discard(params.id)
      return { ok: true }
    },
    { params: IdParams },
  )
  .post('/:id/confirm', ({ params, services, user }) => services.saleConfirmation.confirm(params.id, user.id), {
    params: IdParams,
  })
  .patch(
    '/:id/shipping',
    ({ params, body, services, user }) => services.sales.updateShipping(params.id, body, user.id),
    {
      params: IdParams,
      body: UpdateShippingBody,
    },
  )
  .patch('/:id/notes', ({ params, body, services }) => services.sales.updateNotes(params.id, body.notes), {
    params: IdParams,
    body: NotesBody,
  })
  .post(
    '/:id/payments/:paymentId/change-method',
    ({ params, body, services, user }) =>
      services.sales.changePaymentMethod(params.id, params.paymentId, body, user.id),
    { params: PaymentParams, body: ChangePaymentMethodBody },
  )
  .get(
    '/:id/receipt.pdf',
    async ({ params, services, set }) => {
      const { fileName, pdf } = await services.receipts.salePdf(params.id)
      set.headers['content-type'] = 'application/pdf'
      set.headers['content-disposition'] = `inline; filename="${fileName}"`
      return new Uint8Array(pdf)
    },
    { params: IdParams },
  )
  .post('/:id/fiscal-flag', ({ params, services, user }) => services.sales.flagFiscalRequested(params.id, user.id), {
    params: IdParams,
  })

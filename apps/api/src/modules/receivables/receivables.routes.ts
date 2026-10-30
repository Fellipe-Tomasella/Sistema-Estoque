import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { requireIdempotencyKey } from '../../shared/idempotency'
import { CreateReceiptBody, DueDateBody, IdParams, ReceiptPreviewBody, VoidReceiptBody } from './receivables.schemas'

export const receivablesRoutes = new Elysia()
  .use(authPlugin)
  .guard({ auth: true })
  .get('/customers/:id/receivables', ({ params, services }) => services.receivables.byCustomer(params.id), {
    params: IdParams,
  })
  .patch(
    '/receivables/:id',
    ({ params, body, services, user }) => services.receivables.updateDueDate(params.id, body.dueDate, user.id),
    { params: IdParams, body: DueDateBody },
  )
  .post('/receipts/preview', ({ body, services }) => services.receivableReceipts.preview(body), {
    body: ReceiptPreviewBody,
  })
  .post(
    '/receipts',
    async ({ body, headers, services, user, set }) => {
      const result = await services.receivableReceipts.create(requireIdempotencyKey(headers), body, user.id)
      set.status = result.alreadyProcessed ? 200 : 201
      return result
    },
    { body: CreateReceiptBody },
  )
  .get('/receipts/:id', ({ params, services }) => services.receivableReceipts.view(params.id), { params: IdParams })
  .post(
    '/receipts/:id/void',
    ({ params, body, services, user }) => services.receivableReceipts.void(params.id, body.reason, user.id),
    { params: IdParams, body: VoidReceiptBody },
  )
  .get(
    '/receipts/:id/receipt.pdf',
    async ({ params, services, set }) => {
      const { fileName, pdf } = await services.receipts.receivableReceiptPdf(params.id)
      set.headers['content-type'] = 'application/pdf'
      set.headers['content-disposition'] = `inline; filename="${fileName}"`
      return new Uint8Array(pdf)
    },
    { params: IdParams },
  )

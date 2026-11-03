import { Elysia, t } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { requireIdempotencyKey } from '../../shared/idempotency'
import { CreateAdjustmentBody, CreateEntryBody, IdParams, ListEntriesQuery, ListMovementsQuery } from './stock.schemas'

const page = (query: { page?: number; pageSize?: number }) => ({
  page: query.page ?? 1,
  pageSize: query.pageSize ?? 50,
})

export const stockRoutes = new Elysia()
  .use(authPlugin)
  .guard({ auth: true })
  .get('/stock/alerts', ({ services }) => services.stock.alerts())
  .get('/stock/movements', ({ query, services }) => services.stock.listMovements({ ...query, ...page(query) }), {
    query: ListMovementsQuery,
  })
  .get(
    '/variants/:id/movements',
    ({ params, query, services }) => services.stock.listMovements({ ...query, ...page(query), variantId: params.id }),
    { params: IdParams, query: ListMovementsQuery },
  )
  .post(
    '/stock/entries',
    async ({ body, headers, services, user, set }) => {
      const result = await services.stockEntries.create(requireIdempotencyKey(headers), body, user.id)
      set.status = result.alreadyProcessed ? 200 : 201
      return result
    },
    { body: CreateEntryBody },
  )
  // RN-EST-11: prévia da entrada a partir do XML da NF-e (não grava)
  .post('/stock/entries/nfe-preview', ({ body, services }) => services.stockEntries.previewNfe(body.file), {
    body: t.Object({ file: t.File({ maxSize: '5m' }) }),
  })
  .get('/stock/entries', ({ query, services }) => services.stockEntries.list({ ...query, ...page(query) }), {
    query: ListEntriesQuery,
  })
  .get('/stock/entries/:id', ({ params, services }) => services.stockEntries.get(params.id), { params: IdParams })
  .post(
    '/stock/adjustments',
    ({ body, headers, services, user }) =>
      services.stockAdjustments.create(requireIdempotencyKey(headers), body, user.id),
    { body: CreateAdjustmentBody },
  )

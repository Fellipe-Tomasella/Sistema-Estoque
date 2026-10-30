import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { IdParams, RegisterDocumentBody, UpdateDocumentBody } from './fiscal.schemas'

export const fiscalRoutes = new Elysia()
  .use(authPlugin)
  .guard({ auth: true })
  .get('/fiscal/pending', ({ services }) => services.fiscal.pending())
  .post(
    '/sales/:id/fiscal-documents',
    ({ params, body, services, user, set }) => {
      set.status = 201
      return services.fiscal.register(params.id, body, user.id)
    },
    { params: IdParams, body: RegisterDocumentBody },
  )
  .patch(
    '/fiscal-documents/:id',
    ({ params, body, services, user }) => services.fiscal.update(params.id, body, user.id),
    {
      params: IdParams,
      body: UpdateDocumentBody,
    },
  )

import { Elysia, t } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'

const BatchParams = t.Object({ batchId: t.String({ format: 'uuid' }) })
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const importsRoutes = new Elysia({ prefix: '/stock/import' })
  .use(authPlugin)
  .guard({ auth: true })
  .get('/template', async ({ services, set }) => {
    set.headers['content-type'] = XLSX
    set.headers['content-disposition'] = 'attachment; filename="modelo-importacao-estoque.xlsx"'
    return new Uint8Array(await services.imports.template())
  })
  .post('/preview', ({ body, services, user }) => services.imports.preview(body.file, user.id), {
    body: t.Object({ file: t.File({ maxSize: '10m' }) }),
  })
  .post(
    '/:batchId/commit',
    ({ params, body, services, user }) => services.imports.commit(params.batchId, body.skipErrorRows, user.id),
    { params: BatchParams, body: t.Object({ skipErrorRows: t.Boolean() }) },
  )
  .post('/:batchId/discard', ({ params, services }) => services.imports.discard(params.batchId), {
    params: BatchParams,
  })

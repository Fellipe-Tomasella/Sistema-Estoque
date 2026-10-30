import { Elysia } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'

export const exportsRoutes = new Elysia()
  .use(authPlugin)
  .guard({ auth: true })
  .get('/exports/full.zip', async ({ services, user, set }) => {
    const { fileName, zip } = await services.exports.fullZip(user.id)
    set.headers['content-type'] = 'application/zip'
    set.headers['content-disposition'] = `attachment; filename="${fileName}"`
    return zip
  })

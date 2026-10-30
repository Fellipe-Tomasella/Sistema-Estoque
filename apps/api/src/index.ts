import { Elysia } from 'elysia'
import { createApp } from './app'
import { env } from './config/env'
import { staticSite } from './shared/static-site.plugin'

// Em produção o front (apps/web/dist) é servido pela própria API; em desenvolvimento quem serve é o Vite.
const server = new Elysia().use(createApp())
if (env.publicDir) server.use(staticSite(env.publicDir))
server.listen(env.port)

console.log(`API rodando em http://localhost:${server.server?.port}/api`)

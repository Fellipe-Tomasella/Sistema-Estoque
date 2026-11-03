import { Elysia } from 'elysia'
import { createApp } from './app'
import { env } from './config/env'
import { services } from './container'
import { renderStorefront } from './modules/storefront/site/storefront-site'
import { staticSite } from './shared/static-site.plugin'

// Conta da dona vinda do deploy (FIRST_USER_*), só se o banco ainda não tem nenhuma conta.
const firstUser = await services.auth.ensureFirstUser(env.firstUser)
if (firstUser) console.log(`Primeira conta criada: ${firstUser.email}`)

// Em produção o front (apps/web/dist) é servido pela própria API; em desenvolvimento quem serve é o Vite.
// O site da loja (`/<nome-da-loja>`) vem antes do painel, nos dois casos.
const server = new Elysia()
  .use(createApp())
  .use(staticSite(env.publicDir, (url, cookies) => renderStorefront(services, url, cookies)))
server.listen(env.port)

console.log(`API rodando em http://localhost:${server.server?.port}/api`)

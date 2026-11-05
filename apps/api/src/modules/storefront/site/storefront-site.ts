import { PANEL_PATHS } from '@estoque/shared'
import { env } from '../../../config/env'
import type { Services } from '../../../container'
import { SESSION_COOKIE } from '../../../shared/auth.plugin'
import { cartPage, homePage, notFoundPage, privacyPage, productPage, productPath, type SiteContext } from './pages'

const UUID = /^[0-9a-f-]{36}$/

const page = (body: { value: string }, status = 200) =>
  new Response(body.value, {
    status,
    // o site muda quando a dona mexe no estoque ou nos produtos: sem cache longo
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
  })

/**
 * Site público em `/<nome-da-loja>` (docs/11 §2): início (com `?categoria=`) e `/p/<id>/<nome>`.
 * Devolve null quando o caminho não é do site, para o painel (SPA) responder.
 * Site desligado: só quem está logada vê, como pré-visualização.
 */
export async function renderStorefront(
  services: Services,
  url: URL,
  cookies: Record<string, string | undefined>,
): Promise<Response | null> {
  const [slug, ...rest] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (!slug || slug.includes('.') || (PANEL_PATHS as readonly string[]).includes(slug)) return null

  const site = await services.storefront.site(slug)
  if (!site) return null
  const preview = !site.settings.enabled
  if (preview && !(await services.auth.authenticate(cookies[SESSION_COOKIE]))) return null

  const categories = [...new Set(site.products.map((p) => p.category).filter((c): c is string => Boolean(c)))].sort()
  const ctx: SiteContext = { settings: site.settings, title: site.title, origin: env.appOrigin, preview, categories }
  if (rest.length === 0) return page(homePage(ctx, site.products, url.searchParams.get('categoria')))

  if (rest.length === 1 && rest[0] === 'sacola') return page(cartPage(ctx))
  if (rest.length === 1 && rest[0] === 'privacidade') return page(privacyPage(ctx))
  if (rest[0] === 'p' && rest[1] && UUID.test(rest[1])) {
    const product = await services.storefront.product(rest[1])
    if (product && !(site.settings.hideSoldOut && product.soldOut)) {
      // nome do produto mudou: redireciona para o endereço atual (links antigos continuam valendo)
      const canonical = productPath(ctx, product)
      if (url.pathname !== canonical) return Response.redirect(`${env.appOrigin}${canonical}`, 301)
      return page(productPage(ctx, product))
    }
  }
  return page(notFoundPage(ctx), 404)
}

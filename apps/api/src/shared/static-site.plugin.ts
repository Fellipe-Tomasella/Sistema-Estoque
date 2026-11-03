// Em produção a mesma imagem serve a API e o front (docs/08 §1): mesmo domínio, cookie simples, sem CORS.
import { Elysia } from 'elysia'
import { join, posix } from 'node:path'

const NO_CACHE = 'no-cache'
const IMMUTABLE = 'public, max-age=31536000, immutable'

/** Página gerada no servidor antes do painel (o site da loja); null = não é dela. */
export type PageRenderer = (url: URL, cookies: Record<string, string | undefined>) => Promise<Response | null>

/**
 * Arquivos do build do Vue em `dir`. Caminho sem arquivo (rota do Vue Router) devolve `index.html`;
 * `/api/*` que não existe continua 404 em JSON. Assets com hash ficam em cache longo; o resto, `no-cache`
 * (o service worker e o manifest precisam ser conferidos a cada visita para a atualização chegar).
 * Sem `dir` (desenvolvimento, o Vite serve o painel), só as páginas do `render` respondem.
 */
export function staticSite(dir: string | undefined, render?: PageRenderer) {
  return new Elysia({ name: 'static-site' }).get('/*', async ({ path, set, request, cookie }) => {
    if (path === '/api' || path.startsWith('/api/')) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }
    }
    const relative = posix.normalize(decodeURIComponent(path)).replace(/^\/+/, '')
    const file = dir && relative && !relative.startsWith('..') ? Bun.file(join(dir, relative)) : null
    if (file && (await file.exists())) {
      set.headers['cache-control'] = relative.startsWith('assets/') ? IMMUTABLE : NO_CACHE
      return file
    }
    if (render) {
      const cookies = Object.fromEntries(Object.entries(cookie).map(([k, v]) => [k, v.value as string | undefined]))
      const page = await render(new URL(request.url), cookies)
      if (page) return page
    }
    if (!dir) {
      set.status = 404
      return 'Não encontrado.'
    }
    set.headers['cache-control'] = NO_CACHE
    return Bun.file(join(dir, 'index.html'))
  })
}

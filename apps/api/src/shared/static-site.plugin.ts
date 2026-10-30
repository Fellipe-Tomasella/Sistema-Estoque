// Em produção a mesma imagem serve a API e o front (docs/08 §1): mesmo domínio, cookie simples, sem CORS.
import { Elysia } from 'elysia'
import { join, posix } from 'node:path'

const NO_CACHE = 'no-cache'
const IMMUTABLE = 'public, max-age=31536000, immutable'

/**
 * Arquivos do build do Vue em `dir`. Caminho sem arquivo (rota do Vue Router) devolve `index.html`;
 * `/api/*` que não existe continua 404 em JSON. Assets com hash ficam em cache longo; o resto, `no-cache`
 * (o service worker e o manifest precisam ser conferidos a cada visita para a atualização chegar).
 */
export function staticSite(dir: string) {
  const indexFile = () => Bun.file(join(dir, 'index.html'))

  return new Elysia({ name: 'static-site' }).get('/*', async ({ path, set }) => {
    if (path === '/api' || path.startsWith('/api/')) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }
    }
    const relative = posix.normalize(decodeURIComponent(path)).replace(/^\/+/, '')
    const file = relative && !relative.startsWith('..') ? Bun.file(join(dir, relative)) : null
    if (file && (await file.exists())) {
      set.headers['cache-control'] = relative.startsWith('assets/') ? IMMUTABLE : NO_CACHE
      return file
    }
    set.headers['cache-control'] = NO_CACHE
    return indexFile()
  })
}

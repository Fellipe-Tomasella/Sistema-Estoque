import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { staticSite } from './static-site.plugin'

const dir = mkdtempSync(join(tmpdir(), 'estoque-public-'))
mkdirSync(join(dir, 'assets'))
writeFileSync(join(dir, 'index.html'), '<div id="app"></div>')
writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(1)')
writeFileSync(join(dir, 'sw.js'), '// sw')
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const app = staticSite(dir)
const get = (path: string) => app.handle(new Request(`http://localhost${path}`))

describe('front servido pela API', () => {
  test('rota do Vue Router devolve o index.html sem cache', async () => {
    const res = await get('/vendas/123')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('id="app"')
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  test('asset com hash tem cache longo; service worker não', async () => {
    expect((await get('/assets/app-abc123.js')).headers.get('cache-control')).toContain('immutable')
    expect((await get('/sw.js')).headers.get('cache-control')).toBe('no-cache')
  })

  test('/api inexistente responde 404 em JSON, não o index.html', async () => {
    const res = await get('/api/nao-existe')
    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('NOT_FOUND')
  })

  test('não sai da pasta pública', async () => {
    const res = await get('/..%2F..%2Fetc%2Fpasswd')
    expect(await res.text()).toContain('id="app"')
  })
})

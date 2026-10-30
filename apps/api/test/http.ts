import { createApp } from '../src/app'

const app = createApp()

interface RequestOptions {
  body?: unknown
  cookie?: string
  headers?: Record<string, string>
}

/** Faz uma requisição à API em memória (sem abrir porta). */
export async function request(method: string, path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { ...options.headers }
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.cookie) headers.cookie = options.cookie

  const response = await app.handle(
    new Request(`http://localhost/api${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  )
  const text = await response.text()
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : null,
    /** Cookie `sid` devolvido no Set-Cookie, pronto para mandar de volta. */
    sessionCookie: response.headers
      .getSetCookie()
      .find((c) => c.startsWith('sid='))
      ?.split(';')[0],
  }
}

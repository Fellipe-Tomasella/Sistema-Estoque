import { createApp } from '../src/app'

const app = createApp()

/** Faz uma requisição à API em memória (sem abrir porta). */
export async function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const response = await app.handle(
    new Request(`http://localhost/api${path}`, {
      method,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
  const text = await response.text()
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null }
}

import { Elysia } from 'elysia'
import { env } from '../config/env'
import { ForbiddenError } from './errors'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Proteção CSRF complementar ao cookie SameSite=Lax: em métodos de escrita,
 * um `Origin` enviado pelo navegador precisa ser o próprio sistema.
 */
export const originCheck = new Elysia({ name: 'origin-check' }).onRequest(({ request }) => {
  if (SAFE_METHODS.has(request.method)) return
  const origin = request.headers.get('origin')
  if (origin && origin !== env.appOrigin) throw new ForbiddenError('Requisição de origem não permitida.')
})

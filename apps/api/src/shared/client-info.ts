import type { Server } from 'bun'

/**
 * IP e navegador de quem fez a requisição. Em produção a API só é alcançada pelo Nginx,
 * que sobrescreve `X-Real-IP` com o IP real do cliente.
 */
export function clientInfo(request: Request, server: Server<unknown> | null) {
  return {
    ip: request.headers.get('x-real-ip') ?? server?.requestIP(request)?.address ?? null,
    userAgent: request.headers.get('user-agent'),
  }
}

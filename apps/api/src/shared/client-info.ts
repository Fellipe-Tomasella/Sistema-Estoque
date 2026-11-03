import type { Server } from 'bun'
import { env } from '../config/env'

/**
 * IP e navegador de quem fez a requisição (o limite de tentativas do login usa o IP).
 * Em produção a API só é alcançada pelo proxy (Traefik), que preenche `X-Real-IP`; atrás do Cloudflare,
 * `CLIENT_IP_HEADER=cf-connecting-ip` traz o IP do visitante em vez do IP do Cloudflare.
 */
export function clientInfo(request: Request, server: Server<unknown> | null) {
  return {
    ip: request.headers.get(env.clientIpHeader) ?? server?.requestIP(request)?.address ?? null,
    userAgent: request.headers.get('user-agent'),
  }
}

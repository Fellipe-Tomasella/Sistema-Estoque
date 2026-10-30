import { createHmac, randomBytes } from 'node:crypto'
import { env } from '../config/env'

/** Token aleatório de 32 bytes para cookie de sessão e link de redefinição de senha. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Só o hash vai para o banco; vazamento do banco não entrega sessões válidas. */
export function hashToken(token: string): string {
  return createHmac('sha256', env.sessionSecret).update(token).digest('hex')
}

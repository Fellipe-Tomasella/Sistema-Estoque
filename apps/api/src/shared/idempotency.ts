import { ValidationError } from './errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `Idempotency-Key` (uuid gerado pelo front ao abrir o formulário). Vira o `id` do registro criado,
 * então reenviar a mesma operação devolve o registro existente em vez de duplicar.
 */
export function requireIdempotencyKey(headers: Record<string, string | undefined>): string {
  const key = headers['idempotency-key']
  if (!key || !UUID.test(key)) {
    throw new ValidationError('Cabeçalho Idempotency-Key ausente ou inválido (precisa ser um uuid).')
  }
  return key.toLowerCase()
}

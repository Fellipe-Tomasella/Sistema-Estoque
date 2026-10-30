import type { DbOrTx } from '../../db/client'
import type { AuditRepository } from './audit.repository'

export interface AuditInput {
  entity: string
  entityId?: string | null
  action: string
  before?: unknown
  after?: unknown
  reason?: string | null
  userId?: string | null
}

/** Grava ações sensíveis no `audit_log`. Recebe `tx` para entrar na transação de quem chama. */
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  record(input: AuditInput, tx?: DbOrTx): Promise<void> {
    return this.repo.insert(
      {
        entity: input.entity,
        entityId: input.entityId ?? null,
        action: input.action,
        before: input.before ?? null,
        after: input.after ?? null,
        reason: input.reason ?? null,
        userId: input.userId ?? null,
      },
      tx,
    )
  }

  history(entity: string, entityId: string) {
    return this.repo.listFor(entity, entityId)
  }
}

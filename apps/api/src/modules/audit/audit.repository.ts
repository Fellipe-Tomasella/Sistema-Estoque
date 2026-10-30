import { and, desc, eq } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { auditLog } from '../../db/schema'

export type NewAuditEntry = typeof auditLog.$inferInsert

export class AuditRepository {
  constructor(private readonly db: DbOrTx) {}

  async insert(entry: NewAuditEntry, tx: DbOrTx = this.db): Promise<void> {
    await tx.insert(auditLog).values(entry)
  }

  listFor(entity: string, entityId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, entity), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.createdAt))
  }
}

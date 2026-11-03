import { and, eq, gt, isNull, ne } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { passwordResets, sessions, users } from '../../db/schema'

export class AuthRepository {
  constructor(private readonly db: DbOrTx) {}

  // Usuários

  async findUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email))
    return user
  }

  async hasUsers() {
    const [row] = await this.db.select({ id: users.id }).from(users).limit(1)
    return Boolean(row)
  }

  async insertUser(values: typeof users.$inferInsert) {
    const [user] = await this.db.insert(users).values(values).returning()
    return user!
  }

  async updatePassword(userId: string, passwordHash: string, tx: DbOrTx = this.db) {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, userId))
  }

  // Sessões

  async insertSession(values: typeof sessions.$inferInsert) {
    await this.db.insert(sessions).values(values)
  }

  async findSessionWithUser(tokenHash: string) {
    const [row] = await this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.tokenHash, tokenHash))
    return row
  }

  async touchSession(id: string, lastSeenAt: Date, expiresAt: Date) {
    await this.db.update(sessions).set({ lastSeenAt, expiresAt }).where(eq(sessions.id, id))
  }

  async deleteSession(id: string) {
    await this.db.delete(sessions).where(eq(sessions.id, id))
  }

  /** Apaga as sessões do usuário, exceto (opcionalmente) a atual. */
  async deleteUserSessions(userId: string, exceptSessionId?: string, tx: DbOrTx = this.db) {
    await tx
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined))
  }

  // Redefinição de senha

  async insertPasswordReset(values: typeof passwordResets.$inferInsert) {
    await this.db.insert(passwordResets).values(values)
  }

  async findUsableReset(tokenHash: string, now: Date, tx: DbOrTx = this.db) {
    const [reset] = await tx
      .select()
      .from(passwordResets)
      .where(
        and(eq(passwordResets.tokenHash, tokenHash), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, now)),
      )
      .for('update')
    return reset
  }

  async markResetUsed(id: string, usedAt: Date, tx: DbOrTx = this.db) {
    await tx.update(passwordResets).set({ usedAt }).where(eq(passwordResets.id, id))
  }
}

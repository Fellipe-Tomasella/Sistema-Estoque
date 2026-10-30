import { sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'

export class HealthRepository {
  constructor(private readonly db: DbOrTx) {}

  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`)
  }
}

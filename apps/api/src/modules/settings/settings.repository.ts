import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { type StoreSettings, storeSettings } from '../../db/schema'

export type StoreSettingsUpdate = Partial<Omit<StoreSettings, 'id' | 'updatedAt'>>

export class SettingsRepository {
  constructor(private readonly db: DbOrTx) {}

  /** A linha única é criada com os padrões na primeira leitura. */
  async get(tx: DbOrTx = this.db): Promise<StoreSettings> {
    await tx.insert(storeSettings).values({ id: 1 }).onConflictDoNothing()
    const [row] = await tx.select().from(storeSettings).where(eq(storeSettings.id, 1))
    return row!
  }

  async update(changes: StoreSettingsUpdate, tx: DbOrTx = this.db): Promise<StoreSettings> {
    const [row] = await tx.update(storeSettings).set(changes).where(eq(storeSettings.id, 1)).returning()
    return row!
  }
}

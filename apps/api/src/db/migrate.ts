import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import { db, sql } from './client'

export const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url))

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder })
}

if (import.meta.main) {
  await runMigrations()
  console.log('Migrations aplicadas.')
  await sql.end()
}

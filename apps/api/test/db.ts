import { sql } from '../src/db/client'

/** Limpa todas as tabelas do schema public. Usar em `beforeEach` dos testes que gravam no banco. */
export async function resetDatabase(): Promise<void> {
  const tables = await sql<{ name: string }[]>`
    select quote_ident(tablename) as name from pg_tables where schemaname = 'public'`
  if (tables.length === 0) return
  await sql.unsafe(`truncate ${tables.map((t) => t.name).join(', ')} restart identity cascade`)
}

import { sql } from '../src/db/client'

/** Limpa todas as tabelas do schema public e reinicia as sequências. Usar em `beforeEach` dos testes que gravam no banco. */
export async function resetDatabase(): Promise<void> {
  const tables = await sql<{ name: string }[]>`
    select quote_ident(tablename) as name from pg_tables where schemaname = 'public'`
  if (tables.length > 0) {
    await sql.unsafe(`truncate ${tables.map((t) => t.name).join(', ')} restart identity cascade`)
  }
  const sequences = await sql<{ name: string }[]>`
    select quote_ident(sequence_name) as name from information_schema.sequences where sequence_schema = 'public'`
  for (const { name } of sequences) await sql.unsafe(`alter sequence ${name} restart`)
}

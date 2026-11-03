import { type SQL, type SQLWrapper, sql } from 'drizzle-orm'

/** Texto comparável: minúsculo e sem acento (usa o índice trigram em `products.name`). */
export const searchable = (value: SQLWrapper | string): SQL => sql`immutable_unaccent(lower(${value}))`

/** `%texto%` com curingas do usuário escapados. */
export const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/** Violação de UNIQUE do Postgres (o Drizzle embrulha o erro original em `cause`); `constraint` restringe a um índice. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  for (let current = error; current instanceof Object; current = (current as { cause?: unknown }).cause) {
    const pg = current as { code?: string; constraint_name?: string }
    if (pg.code === '23505') return !constraint || pg.constraint_name === constraint
  }
  return false
}

/** Comparação de igualdade sem diferenciar maiúsculas. */
export const equalsIgnoreCase = (column: SQLWrapper, value: string): SQL => sql`lower(${column}) = lower(${value})`

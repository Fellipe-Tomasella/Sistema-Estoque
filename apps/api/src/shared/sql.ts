import { type SQL, type SQLWrapper, sql } from 'drizzle-orm'

/** Texto comparável: minúsculo e sem acento (usa o índice trigram em `products.name`). */
export const searchable = (value: SQLWrapper | string): SQL => sql`immutable_unaccent(lower(${value}))`

/** `%texto%` com curingas do usuário escapados. */
export const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/** Violação de UNIQUE do Postgres (o Drizzle embrulha o erro original em `cause`). */
export function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current instanceof Object; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: string }).code === '23505') return true
  }
  return false
}

/** Comparação de igualdade sem diferenciar maiúsculas. */
export const equalsIgnoreCase = (column: SQLWrapper, value: string): SQL => sql`lower(${column}) = lower(${value})`

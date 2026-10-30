import type { TLiteral, TSchema, TUnion } from '@sinclair/typebox'
import { t } from 'elysia'

/** Um `TLiteral` por valor da lista (o tipo que o Elysia/Eden entende como união de literais). */
type Literals<T extends readonly string[]> = { -readonly [K in keyof T]: TLiteral<T[K]> }

/**
 * Enum como união de literais. Não usar `t.UnionEnum` em campos opcionais:
 * o Elysia preenche o campo ausente com o primeiro valor da lista.
 */
export const OneOf = <const T extends readonly string[]>(values: T) =>
  t.Union(values.map((value) => t.Literal(value))) as unknown as TUnion<Extract<Literals<T>, TSchema[]>>

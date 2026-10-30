import type { TLiteral, TUnion } from '@sinclair/typebox'
import { t } from 'elysia'

/**
 * Enum como união de literais. Não usar `t.UnionEnum` em campos opcionais:
 * o Elysia preenche o campo ausente com o primeiro valor da lista.
 */
export const OneOf = <const T extends readonly string[]>(values: T) =>
  t.Union(values.map((value) => t.Literal(value))) as unknown as TUnion<TLiteral<T[number]>[]>

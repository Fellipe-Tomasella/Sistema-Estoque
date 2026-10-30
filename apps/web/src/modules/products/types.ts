// Tipos vindos da API (Eden): mudou a API, o front acusa na compilação.
import type { client } from '@/lib/api'

type Data<T extends (...args: never[]) => Promise<{ data: unknown }>> = NonNullable<Awaited<ReturnType<T>>['data']>

export type ProductPage = Data<typeof client.products.get>
export type Product = ProductPage['items'][number]
export type Variant = Product['variants'][number]
export type VariantSearchResult = Data<typeof client.variants.search.get>[number]

/** Linha do gerador de combinações (antes de salvar). */
export interface VariantDraft {
  color: string
  size: string
  enabled: boolean
  priceCents: number | null
  initialQty: number
  minStock: number | null
}

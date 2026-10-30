import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { client, unwrap } from '@/lib/api'
import { invalidateStock, keys } from '@/lib/query'

type EntryBody = Parameters<typeof client.stock.entries.post>[0]
type AdjustmentBody = Parameters<typeof client.stock.adjustments.post>[0]
type MovementsQuery = NonNullable<Parameters<typeof client.stock.movements.get>[0]>['query']
type EntriesQuery = NonNullable<Parameters<typeof client.stock.entries.get>[0]>['query']

/** Gravações de estoque mandam a Idempotency-Key gerada ao abrir o formulário (clique duplo não duplica). */
const withKey = (key: string) => ({ headers: { 'idempotency-key': key } })

export function useVariant(id: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    queryKey: computed(() => ['variant', toValue(id)]),
    queryFn: () => unwrap(client.variants({ id: toValue(id)! }).get()),
    enabled: computed(() => Boolean(toValue(id))),
  })
}

export function useEntries(filters: MaybeRefOrGetter<EntriesQuery>) {
  return useQuery({
    queryKey: computed(() => [...keys.stock, 'entries', toValue(filters)]),
    queryFn: () => unwrap(client.stock.entries.get({ query: toValue(filters) })),
    placeholderData: (previous) => previous,
  })
}

export function useEntry(id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => [...keys.stock, 'entry', toValue(id)]),
    queryFn: () => unwrap(client.stock.entries({ id: toValue(id)! }).get()),
    enabled: computed(() => Boolean(toValue(id))),
  })
}

/** Histórico geral ou de uma variação (RN-EST-10). */
export function useMovements(
  variantId: MaybeRefOrGetter<string | undefined>,
  filters: MaybeRefOrGetter<MovementsQuery>,
) {
  return useQuery({
    queryKey: computed(() => [...keys.stock, 'movements', toValue(variantId), toValue(filters)]),
    queryFn: () => {
      const id = toValue(variantId)
      const query = toValue(filters)
      return unwrap(id ? client.variants({ id }).movements.get({ query }) : client.stock.movements.get({ query }))
    },
    placeholderData: (previous) => previous,
  })
}

export function useStockMutations() {
  return {
    createEntry: useMutation({
      mutationFn: ({ key, body }: { key: string; body: EntryBody }) =>
        unwrap(client.stock.entries.post(body, withKey(key))),
      onSuccess: invalidateStock,
    }),
    createAdjustment: useMutation({
      mutationFn: ({ key, body }: { key: string; body: AdjustmentBody }) =>
        unwrap(client.stock.adjustments.post(body, withKey(key))),
      onSuccess: invalidateStock,
    }),
  }
}

import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { client, unwrap } from '@/lib/api'
import { invalidateStock, keys } from '@/lib/query'

type ListQuery = NonNullable<Parameters<typeof client.products.get>[0]>['query']
type CreateBody = Parameters<typeof client.products.post>[0]
type UpdateBody = Parameters<ReturnType<typeof client.products>['patch']>[0]
type VariantBody = Parameters<ReturnType<typeof client.variants>['patch']>[0]
type NewVariants = Parameters<ReturnType<typeof client.products>['variants']['post']>[0]['variants']

export function useProductList(filters: MaybeRefOrGetter<ListQuery>) {
  return useQuery({
    queryKey: computed(() => keys.products(toValue(filters))),
    queryFn: () => unwrap(client.products.get({ query: toValue(filters) })),
    placeholderData: (previous) => previous,
  })
}

export function useProduct(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.product(toValue(id))),
    queryFn: () => unwrap(client.products({ id: toValue(id) }).get()),
    enabled: computed(() => Boolean(toValue(id))),
  })
}

/** Cores, tamanhos e categorias já usados, para os chips de sugestão. */
export function useProductSuggestions() {
  return useQuery({ queryKey: keys.suggestions, queryFn: () => unwrap(client.products.suggestions.get()) })
}

export function useProductMutations() {
  const product = (id: string) => client.products({ id })
  return {
    create: useMutation({
      mutationFn: (body: CreateBody) => unwrap(client.products.post(body)),
      onSuccess: invalidateStock,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateBody }) => unwrap(product(id).patch(body)),
      onSuccess: invalidateStock,
    }),
    addVariants: useMutation({
      mutationFn: ({ id, variants }: { id: string; variants: NewVariants }) =>
        unwrap(product(id).variants.post({ variants })),
      onSuccess: invalidateStock,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        unwrap(active ? product(id).activate.post() : product(id).deactivate.post()),
      onSuccess: invalidateStock,
    }),
    setMinStock: useMutation({
      mutationFn: ({ id, minStock }: { id: string; minStock: number | null }) =>
        unwrap(product(id)['min-stock'].post({ minStock })),
      onSuccess: invalidateStock,
    }),
    remove: useMutation({ mutationFn: (id: string) => unwrap(product(id).delete()), onSuccess: invalidateStock }),
    updateVariant: useMutation({
      mutationFn: ({ id, body }: { id: string; body: VariantBody }) => unwrap(client.variants({ id }).patch(body)),
      onSuccess: invalidateStock,
    }),
    removeVariant: useMutation({
      mutationFn: (id: string) => unwrap(client.variants({ id }).delete()),
      onSuccess: invalidateStock,
    }),
  }
}

import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { client, unwrap } from '@/lib/api'
import { keys, queryClient } from '@/lib/query'

type ListQuery = NonNullable<Parameters<typeof client.sales.get>[0]>['query']
type ShippingBody = Parameters<ReturnType<typeof client.sales>['shipping']['patch']>[0]
type ChangeMethodBody = Parameters<ReturnType<ReturnType<typeof client.sales>['payments']>['change-method']['post']>[0]
type FiscalDocBody = Parameters<ReturnType<typeof client.sales>['fiscal-documents']['post']>[0]

export type SaleSummary = NonNullable<Awaited<ReturnType<typeof client.sales.get>>['data']>['items'][number]
type SaleResponse = NonNullable<Awaited<ReturnType<ReturnType<typeof client.sales>['get']>>['data']>
/** Venda confirmada/cancelada (rascunho abre no PDV). */
export type SaleDetail = Extract<SaleResponse, { fiscalDocuments: unknown }>

export function useSaleList(filters: MaybeRefOrGetter<ListQuery>) {
  return useQuery({
    queryKey: computed(() => keys.sales(toValue(filters))),
    queryFn: () => unwrap(client.sales.get({ query: toValue(filters) })),
    placeholderData: (previous) => previous,
  })
}

export function useSale(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => keys.sale(toValue(id))),
    queryFn: async () => (await unwrap(client.sales({ id: toValue(id) }).get())) as SaleDetail,
    enabled: computed(() => Boolean(toValue(id))),
  })
}

/** Edições depois de confirmar (RN-VEN-11). Atualizam a venda, listas, Início e pendências. */
export function useSaleMutations(id: MaybeRefOrGetter<string>) {
  const sale = () => client.sales({ id: toValue(id) })
  const refresh = () =>
    Promise.all(
      [['sales'], keys.dashboard, keys.pending, keys.reports].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    )
  return {
    shipping: useMutation({
      mutationFn: (body: ShippingBody) => unwrap(sale().shipping.patch(body)),
      onSuccess: refresh,
    }),
    notes: useMutation({
      mutationFn: (notes: string | null) => unwrap(sale().notes.patch({ notes })),
      onSuccess: refresh,
    }),
    changeMethod: useMutation({
      mutationFn: ({ paymentId, body }: { paymentId: string; body: ChangeMethodBody }) =>
        unwrap(sale().payments({ paymentId })['change-method'].post(body)),
      onSuccess: refresh,
    }),
    fiscalFlag: useMutation({ mutationFn: () => unwrap(sale()['fiscal-flag'].post()), onSuccess: refresh }),
    registerDocument: useMutation({
      mutationFn: (body: FiscalDocBody) => unwrap(sale()['fiscal-documents'].post(body)),
      onSuccess: refresh,
    }),
  }
}

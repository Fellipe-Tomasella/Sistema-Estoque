import type { RefundStatus } from '@estoque/shared'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { client, unwrap } from '@/lib/api'
import { invalidateStock, keys, queryClient } from '@/lib/query'

type ReturnBody = Parameters<ReturnType<typeof client.sales>['returns']['post']>[0]
type RefundDoneBody = Parameters<ReturnType<typeof client.refunds>['done']['post']>[0]
type ItemCondition = Parameters<
  ReturnType<ReturnType<typeof client.returns>['items']>['receive']['post']
>[0]['condition']

export type ReturnPreview = NonNullable<
  Awaited<ReturnType<ReturnType<typeof client.sales>['returns']['preview']['post']>>['data']
>
export type { ReturnBody }

/** Cancelar/devolver mexe em estoque, dinheiro, fiado, pendências e relatórios. */
const refreshAll = () =>
  Promise.all([
    invalidateStock(),
    ...[['sales'], ['customers'], keys.receivables, keys.pending, keys.reports, ['returns'], ['refunds']].map(
      (queryKey) => queryClient.invalidateQueries({ queryKey }),
    ),
  ])

/** RN-CAN-02: prévia do cancelamento (o que volta, o que é anulado, o que devolver). */
export function useCancelPreview(
  saleId: MaybeRefOrGetter<string>,
  itemsWithStore: MaybeRefOrGetter<boolean | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => ['sales', 'cancel-preview', toValue(saleId), toValue(itemsWithStore)]),
    queryFn: () =>
      unwrap(
        client
          .sales({ id: toValue(saleId) })
          ['cancel-preview'].get({ query: { itemsWithStore: toValue(itemsWithStore) } }),
      ),
    enabled: computed(() => toValue(enabled)),
    retry: false,
  })
}

export function useReturnMutations(saleId: MaybeRefOrGetter<string>) {
  const sale = () => client.sales({ id: toValue(saleId) })
  return {
    cancel: useMutation({
      mutationFn: (body: { reason: string; itemsWithStore: boolean }) => unwrap(sale().cancel.post(body)),
      onSuccess: refreshAll,
    }),
    preview: useMutation({
      mutationFn: (body: ReturnBody) => unwrap(sale().returns.preview.post(body)),
      meta: { silent: true },
    }),
    execute: useMutation({
      mutationFn: ({ key, body }: { key: string; body: ReturnBody }) =>
        unwrap(sale().returns.post(body, { headers: { 'idempotency-key': key } })),
      onSuccess: refreshAll,
    }),
  }
}

/** Peças aguardando voltar (RN-CAN-05) e devoluções de valor (RN-DEV-07). */
export function useAwaitingReturns() {
  return useQuery({ queryKey: ['returns', 'awaiting'], queryFn: () => unwrap(client.returns.get()) })
}
export function useRefunds(status: MaybeRefOrGetter<RefundStatus | undefined>) {
  return useQuery({
    queryKey: computed(() => ['refunds', toValue(status)]),
    queryFn: () => unwrap(client.refunds.get({ query: { status: toValue(status) } })),
  })
}

export function usePendingMutations() {
  return {
    receiveItem: useMutation({
      mutationFn: ({ returnId, itemId, condition }: { returnId: string; itemId: string; condition: ItemCondition }) =>
        unwrap(client.returns({ id: returnId }).items({ itemId }).receive.post({ condition })),
      onSuccess: refreshAll,
    }),
    refundDone: useMutation({
      mutationFn: ({ id, body }: { id: string; body: RefundDoneBody }) =>
        unwrap(client.refunds({ id }).done.post(body)),
      onSuccess: refreshAll,
    }),
    refundCancel: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        unwrap(client.refunds({ id }).cancel.post({ reason })),
      onSuccess: refreshAll,
    }),
  }
}

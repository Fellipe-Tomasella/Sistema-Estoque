import type { ShippingStatus } from '@estoque/shared'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { client, unwrap } from '@/lib/api'
import { keys, queryClient } from '@/lib/query'

const refresh = () =>
  Promise.all([['sales'], keys.dashboard, keys.pending].map((queryKey) => queryClient.invalidateQueries({ queryKey })))

/** RN-FIS-06/07: vendas que precisam (ou podem precisar) de nota e notas a cancelar no emissor. */
export function useFiscalPending() {
  return useQuery({ queryKey: [...keys.pending, 'fiscal'], queryFn: () => unwrap(client.fiscal.pending.get()) })
}

export function usePendingActions() {
  return {
    shipping: useMutation({
      mutationFn: ({ saleId, status }: { saleId: string; status: ShippingStatus }) =>
        unwrap(client.sales({ id: saleId }).shipping.patch({ status })),
      onSuccess: refresh,
    }),
    documentCancelled: useMutation({
      mutationFn: ({ id, date }: { id: string; date: string }) =>
        unwrap(client['fiscal-documents']({ id }).patch({ cancelled: true, cancelledAt: date })),
      onSuccess: refresh,
    }),
  }
}

export const saleLabel = (n: number | null) => (n ? `#${String(n).padStart(6, '0')}` : '—')

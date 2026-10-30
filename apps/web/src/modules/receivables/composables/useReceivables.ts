import { useMutation, useQuery } from '@tanstack/vue-query'
import { client, unwrap } from '@/lib/api'
import { keys, queryClient } from '@/lib/query'

type PreviewBody = Parameters<typeof client.receipts.preview.post>[0]
type ReceiptBody = Parameters<typeof client.receipts.post>[0]
export type ReceiptPreview = NonNullable<Awaited<ReturnType<typeof client.receipts.preview.post>>['data']>

/** Recebimento mexe em dívida, venda (situação de pagamento), cliente, Início e fechamento. */
const refreshMoney = () =>
  Promise.all(
    [keys.receivables, ['customers'], ['sales'], keys.dashboard, keys.reports].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  )

/** RN-REL-03: clientes com saldo, total por cliente e “em atraso”. */
export function useOpenReceivables() {
  return useQuery({
    queryKey: [...keys.receivables, 'report'],
    queryFn: () => unwrap(client.reports.receivables.get()),
  })
}

export function useReceivableMutations() {
  return {
    /** RN-FIA-04: quanto vai para cada dívida e o saldo que fica, antes de salvar. */
    preview: useMutation({
      mutationFn: (body: PreviewBody) => unwrap(client.receipts.preview.post(body)),
      meta: { silent: true },
    }),
    receive: useMutation({
      mutationFn: ({ key, body }: { key: string; body: ReceiptBody }) =>
        unwrap(client.receipts.post(body, { headers: { 'idempotency-key': key } })),
      onSuccess: refreshMoney,
    }),
    void: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        unwrap(client.receipts({ id }).void.post({ reason })),
      onSuccess: refreshMoney,
    }),
    dueDate: useMutation({
      mutationFn: ({ id, dueDate }: { id: string; dueDate: string | null }) =>
        unwrap(client.receivables({ id }).patch({ dueDate })),
      onSuccess: refreshMoney,
    }),
  }
}

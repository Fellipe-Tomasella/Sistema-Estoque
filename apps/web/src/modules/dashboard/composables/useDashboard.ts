import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { client, unwrap } from '@/lib/api'
import { keys } from '@/lib/query'

/** Dados do Início; o layout usa o mesmo cache para o número de pendências no menu. */
export function useDashboard() {
  const query = useQuery({ queryKey: keys.dashboard, queryFn: () => unwrap(client.dashboard.get()) })
  const pendingCount = computed(() => {
    const a = query.data.value?.alerts
    return a ? a.returnsAwaiting + a.refundsPending + a.fiscalPending + a.shippingPending : 0
  })
  return { ...query, pendingCount }
}

import { useMutation, useQuery } from '@tanstack/vue-query'
import { useRouteQuery } from '@vueuse/router'
import { computed, type MaybeRefOrGetter, toValue, watch } from 'vue'
import { client, unwrap } from '@/lib/api'
import { keys, queryClient } from '@/lib/query'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'

type SalesQuery = NonNullable<Parameters<typeof client.reports.sales.get>[0]>['query']
type RankingQuery = NonNullable<Parameters<(typeof client.reports)['products-ranking']['get']>[0]>['query']

/** Soma dias a uma data `AAAA-MM-DD` sem passar por fuso. */
export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Período dos relatórios na URL (`?de=&ate=`), começando no mês atual da loja. */
export function usePeriod() {
  const { data: dashboard } = useDashboard()
  const today = computed(() => dashboard.value?.today ?? '')
  const from = useRouteQuery<string>('de', '')
  const to = useRouteQuery<string>('ate', '')
  watch(
    today,
    (t) => {
      if (!t) return
      if (!from.value) from.value = `${t.slice(0, 8)}01`
      if (!to.value) to.value = t
    },
    { immediate: true },
  )
  const presets = computed(() => {
    const t = today.value
    if (!t) return []
    const lastMonthEnd = shiftDate(`${t.slice(0, 8)}01`, -1)
    return [
      { label: 'Hoje', from: t, to: t },
      { label: '7 dias', from: shiftDate(t, -6), to: t },
      { label: 'Este mês', from: `${t.slice(0, 8)}01`, to: t },
      { label: 'Mês passado', from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd },
    ]
  })
  const ready = computed(() => Boolean(from.value && to.value))
  return { from, to, today, presets, ready }
}

export function useSalesReport(query: MaybeRefOrGetter<SalesQuery>, enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => [...keys.reports, 'sales', toValue(query)]),
    queryFn: () => unwrap(client.reports.sales.get({ query: toValue(query) })),
    enabled: computed(() => toValue(enabled)),
    placeholderData: (previous) => previous,
  })
}

export function useRankingReport(query: MaybeRefOrGetter<RankingQuery>, enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => [...keys.reports, 'ranking', toValue(query)]),
    queryFn: () => unwrap(client.reports['products-ranking'].get({ query: toValue(query) })),
    enabled: computed(() => toValue(enabled)),
    placeholderData: (previous) => previous,
  })
}

/** Fechamento do dia (RN-FEC): conta por forma, dinheiro esperado x contado, refazer mostra diferenças. */
export function useClosing(date: MaybeRefOrGetter<string>) {
  const query = useQuery({
    queryKey: computed(() => [...keys.reports, 'closing', toValue(date)]),
    queryFn: () => unwrap(client.closings({ date: toValue(date) }).get()),
    enabled: computed(() => Boolean(toValue(date))),
  })
  const save = useMutation({
    mutationFn: (body: { countedCashCents: number; notes: string | null }) =>
      unwrap(client.closings({ date: toValue(date) }).put(body)),
    onSuccess: (data) => queryClient.setQueryData([...keys.reports, 'closing', toValue(date)], data),
  })
  return { ...query, save }
}

/** Link de CSV com os mesmos filtros da tela (RN-REL-06). */
export const csvUrl = (path: string, params: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])))
  return `/api/reports/${path}.csv?${search}`
}

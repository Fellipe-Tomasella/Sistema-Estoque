<script setup lang="ts">
import { Banknote, PackageSearch, ShieldCheck, Truck } from '@lucide/vue'
import { useRouteQuery } from '@vueuse/router'
import { computed } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import AwaitingReturns from '../components/AwaitingReturns.vue'
import FiscalPending from '../components/FiscalPending.vue'
import PendingRefunds from '../components/PendingRefunds.vue'
import PendingShipments from '../components/PendingShipments.vue'

/** Central de pendências (06 §Pendências): o que a dona precisa resolver, em abas. O Início abre cada aba. */
const tab = useRouteQuery<string>('aba', 'envios')
const { data } = useDashboard()

const tabs = computed(() => {
  const a = data.value?.alerts
  return [
    {
      value: 'envios',
      label: 'Aguardando envio',
      icon: Truck,
      count: a?.shippingPending ?? 0,
      component: PendingShipments,
    },
    {
      value: 'retornos',
      label: 'Retorno de peças',
      icon: PackageSearch,
      count: a?.returnsAwaiting ?? 0,
      component: AwaitingReturns,
    },
    {
      value: 'devolucoes',
      label: 'Devolver dinheiro',
      icon: Banknote,
      count: a?.refundsPending ?? 0,
      component: PendingRefunds,
    },
    { value: 'fiscal', label: 'Fiscal', icon: ShieldCheck, count: a?.fiscalPending ?? 0, component: FiscalPending },
  ]
})
const current = computed(() => tabs.value.find((t) => t.value === tab.value) ?? tabs.value[0]!)
</script>

<template>
  <PageHeader title="Pendências" description="Envios, peças a voltar, dinheiro a devolver e notas fiscais." />

  <div class="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      :class="
        cn(
          'flex items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors',
          t.value === current.value ? 'border-brand ring-2 ring-brand/20' : 'hover:bg-muted/50',
        )
      "
      @click="tab = t.value"
    >
      <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <component :is="t.icon" class="size-5" />
      </span>
      <span class="min-w-0">
        <span class="block text-2xl leading-tight font-semibold tabular" :class="t.count > 0 && 'text-red-700'">{{
          t.count
        }}</span>
        <span class="block truncate text-xs text-muted-foreground">{{ t.label }}</span>
      </span>
    </button>
  </div>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <h2 class="border-b px-4 py-3 font-semibold">{{ current.label }}</h2>
    <component :is="current.component" />
  </Card>
</template>

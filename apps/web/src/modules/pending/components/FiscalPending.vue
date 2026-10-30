<script setup lang="ts">
import { CircleAlert, FileCheck2, ShieldCheck } from '@lucide/vue'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import { FISCAL, FISCAL_DOC } from '@/modules/sales/labels'
import { useFiscalPending, usePendingActions } from '../composables/usePending'

/** Pendências fiscais (docs/07): vendas sem nota que precisam/podem precisar dela e notas a cancelar. */
const { data, isPending } = useFiscalPending()
const { data: dashboard } = useDashboard()
const { documentCancelled } = usePendingActions()

async function markCancelled(id: string) {
  await documentCancelled.mutateAsync({ id, date: dashboard.value?.today ?? new Date().toISOString().slice(0, 10) })
  toast.success('Cancelamento da nota registrado.')
}
</script>

<template>
  <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 3" :key="i" class="h-12" /></div>
  <template v-else-if="data">
    <p v-if="data.banner" class="m-4 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
      <CircleAlert class="mt-0.5 size-4 shrink-0" /> {{ data.banner }}
    </p>
    <EmptyState
      v-if="!data.salesWithoutDocument.length && !data.cancelPending.length"
      :icon="ShieldCheck"
      title="Nada pendente no fiscal"
      description="Vendas que precisam de nota aparecem aqui até você registrar a nota emitida."
    />
    <div
      v-for="s in data.salesWithoutDocument"
      :key="s.saleId"
      class="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0"
    >
      <RouterLink :to="`/vendas/${s.saleId}`" class="min-w-0 flex-1 hover:underline">
        <p class="font-semibold text-brand">
          {{ s.numberLabel }} <span class="font-normal text-foreground">· {{ s.customerName ?? 'Sem cliente' }}</span>
        </p>
        <p class="text-xs text-muted-foreground">{{ formatDate(s.businessDate) }} · {{ s.note }}</p>
      </RouterLink>
      <MoneyText :cents="s.totalCents" class="font-semibold" />
      <StatusBadge v-if="s.requirement" :tone="FISCAL[s.requirement].tone">{{
        FISCAL[s.requirement].label
      }}</StatusBadge>
      <Button size="sm" variant="outline" as-child>
        <RouterLink :to="`/vendas/${s.saleId}`">Registrar nota</RouterLink>
      </Button>
    </div>
    <div
      v-for="d in data.cancelPending"
      :key="d.id"
      class="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0"
    >
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{{ FISCAL_DOC[d.docType] }} nº {{ d.number }} · venda {{ d.saleNumberLabel }}</p>
        <p class="text-xs text-muted-foreground">{{ d.message }}</p>
      </div>
      <Button size="sm" variant="outline" :disabled="documentCancelled.isPending.value" @click="markCancelled(d.id)">
        <FileCheck2 /> Cancelei no emissor
      </Button>
    </div>
  </template>
</template>

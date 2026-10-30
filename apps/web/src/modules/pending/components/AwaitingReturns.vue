<script setup lang="ts">
import type { ItemCondition } from '@estoque/shared'
import { Check, PackageSearch, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { useAwaitingReturns, usePendingMutations } from '@/modules/returns/composables/useReturns'
import { saleLabel } from '../composables/usePending'

/** Peças que a cliente ainda vai devolver (RN-CAN-05): ao chegar, boa volta ao estoque; com defeito, não. */
const { data, isPending } = useAwaitingReturns()
const { receiveItem } = usePendingMutations()

async function receive(returnId: string, itemId: string, condition: ItemCondition) {
  await receiveItem.mutateAsync({ returnId, itemId, condition })
  toast.success(
    condition === 'sellable'
      ? 'Peça recebida e de volta ao estoque.'
      : 'Peça recebida com defeito (não volta ao estoque).',
  )
}
</script>

<template>
  <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 3" :key="i" class="h-12" /></div>
  <EmptyState
    v-else-if="!data?.length"
    :icon="PackageSearch"
    title="Nenhuma peça aguardando"
    description="Peças de vendas canceladas ou devolvidas que ainda estão com a cliente aparecem aqui."
  />
  <div v-for="r in data ?? []" :key="r.id" class="space-y-2 border-b px-4 py-3 last:border-0">
    <RouterLink :to="`/vendas/${r.saleId}`" class="block hover:underline">
      <p class="font-semibold text-brand">
        Venda {{ saleLabel(r.saleNumber) }}
        <span class="font-normal text-foreground">· {{ r.customer?.name ?? 'Sem cliente' }}</span>
      </p>
      <p class="text-xs text-muted-foreground">
        desde {{ formatDate(r.businessDate) }}<template v-if="r.reason"> · {{ r.reason }}</template>
      </p>
    </RouterLink>
    <div
      v-for="item in r.items"
      :key="item.id"
      class="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm"
    >
      <span class="min-w-0 flex-1">{{ item.quantity }}× {{ item.productName }} {{ item.variantLabel }}</span>
      <StatusBadge v-if="item.status === 'received'" tone="success">Recebida</StatusBadge>
      <template v-else>
        <Button
          size="sm"
          variant="outline"
          :disabled="receiveItem.isPending.value"
          @click="receive(r.id, item.id, 'sellable')"
        >
          <Check /> Chegou boa
        </Button>
        <Button
          size="sm"
          variant="ghost"
          :disabled="receiveItem.isPending.value"
          @click="receive(r.id, item.id, 'damaged')"
        >
          <TriangleAlert /> Com defeito
        </Button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PackageCheck, Truck } from '@lucide/vue'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { useSaleList } from '@/modules/sales/composables/useSales'
import { usePendingActions } from '../composables/usePending'

/** Vendas aguardando envio (RN-ENV-01): marcar como enviada direto da fila. */
const { data, isPending } = useSaleList({ shippingStatus: 'pending', status: 'confirmed', pageSize: 200 })
const { shipping } = usePendingActions()

async function shipped(saleId: string, label: string | null) {
  await shipping.mutateAsync({ saleId, status: 'shipped' })
  toast.success(`Venda ${label} marcada como enviada.`)
}
</script>

<template>
  <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 3" :key="i" class="h-12" /></div>
  <EmptyState
    v-else-if="!data?.items.length"
    :icon="Truck"
    title="Nada para enviar"
    description="Vendas com envio aparecem aqui até serem enviadas."
  />
  <div v-for="s in data?.items ?? []" :key="s.id" class="flex items-center gap-3 border-b px-4 py-3 last:border-0">
    <RouterLink :to="`/vendas/${s.id}`" class="min-w-0 flex-1 hover:underline">
      <p class="font-semibold text-brand">
        {{ s.numberLabel }} <span class="font-normal text-foreground">· {{ s.customerName ?? 'Sem cliente' }}</span>
      </p>
      <p class="text-xs text-muted-foreground">
        {{ formatDateTime(s.confirmedAt) }} · <MoneyText :cents="s.totalCents" />
      </p>
    </RouterLink>
    <Button size="sm" :disabled="shipping.isPending.value" @click="shipped(s.id, s.numberLabel)">
      <PackageCheck /> Enviado
    </Button>
  </div>
</template>

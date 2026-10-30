<script setup lang="ts">
import type { ShippingStatus } from '@estoque/shared'
import { Copy, LoaderCircle, PackageCheck, Truck, Undo2 } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/format'
import { type SaleDetail, useSaleMutations } from '../composables/useSales'
import { NEXT_SHIPPING, SHIPPING_STATUS } from '../labels'

/** Envio da venda (RN-ENV-01/02): endereço, rastreio e o próximo passo (enviado → entregue), podendo voltar um. */
const props = defineProps<{ sale: SaleDetail }>()
const { shipping } = useSaleMutations(() => props.sale.id)
const { copy } = useClipboard()

const tracking = ref(props.sale.shipping.trackingCode ?? '')
watch(
  () => props.sale.shipping.trackingCode,
  (v) => (tracking.value = v ?? ''),
)
const PREVIOUS: Record<ShippingStatus, ShippingStatus | null> = {
  none: null,
  pending: 'none',
  shipped: 'pending',
  delivered: 'shipped',
}

async function setStatus(status: ShippingStatus) {
  await shipping.mutateAsync({ status, trackingCode: tracking.value.trim() || null })
  toast.success(`Envio: ${SHIPPING_STATUS[status].label.toLowerCase()}.`)
}
async function saveTracking() {
  await shipping.mutateAsync({ status: props.sale.shipping.status, trackingCode: tracking.value.trim() || null })
  toast.success('Código de rastreio salvo.')
}

const address = () => {
  const a = props.sale.shipping.address
  return a ? [a.street, a.number, a.complement, a.district, a.city].filter(Boolean).join(', ') : null
}
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold">
      <Truck class="size-4 text-brand" /> Envio
      <StatusBadge :tone="SHIPPING_STATUS[sale.shipping.status].tone" class="ml-auto">
        {{ SHIPPING_STATUS[sale.shipping.status].label }}
      </StatusBadge>
    </h2>

    <template v-if="sale.shipping.status !== 'none'">
      <div class="space-y-1 text-sm">
        <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Destino</p>
        <p>
          {{ address() ?? 'Endereço não informado'
          }}<template v-if="sale.shipping.uf"> — {{ sale.shipping.uf }}</template>
        </p>
        <p v-if="sale.shipping.shippedAt" class="text-xs text-muted-foreground">
          Enviado em {{ formatDateTime(sale.shipping.shippedAt) }}
        </p>
        <p v-if="sale.shipping.deliveredAt" class="text-xs text-muted-foreground">
          Entregue em {{ formatDateTime(sale.shipping.deliveredAt) }}
        </p>
      </div>
      <div class="space-y-1">
        <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Código de rastreio</p>
        <div class="flex gap-2">
          <Input v-model="tracking" placeholder="Opcional" />
          <Button
            v-if="sale.shipping.trackingCode && tracking === sale.shipping.trackingCode"
            variant="outline"
            size="icon"
            aria-label="Copiar código"
            @click="copy(tracking).then(() => toast.success('Código copiado.'))"
          >
            <Copy />
          </Button>
          <Button v-else variant="outline" :disabled="shipping.isPending.value" @click="saveTracking">Salvar</Button>
        </div>
      </div>
    </template>
    <p v-else class="text-sm text-muted-foreground">Venda sem envio (retirada ou entrega em mãos).</p>

    <template v-if="sale.status === 'confirmed'">
      <Button
        v-if="NEXT_SHIPPING[sale.shipping.status]"
        class="bg-brand text-brand-foreground hover:bg-brand/90"
        :disabled="shipping.isPending.value"
        @click="setStatus(NEXT_SHIPPING[sale.shipping.status]!.to)"
      >
        <LoaderCircle v-if="shipping.isPending.value" class="animate-spin" /><PackageCheck v-else />
        {{ NEXT_SHIPPING[sale.shipping.status]!.label }}
      </Button>
      <Button v-if="sale.shipping.status === 'none'" variant="outline" @click="setStatus('pending')">
        <Truck /> Vai ter envio
      </Button>
      <button
        v-if="PREVIOUS[sale.shipping.status]"
        type="button"
        class="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:underline"
        @click="setStatus(PREVIOUS[sale.shipping.status]!)"
      >
        <Undo2 class="size-3" /> Voltar para “{{ SHIPPING_STATUS[PREVIOUS[sale.shipping.status]!].label }}”
      </button>
    </template>
  </Card>
</template>

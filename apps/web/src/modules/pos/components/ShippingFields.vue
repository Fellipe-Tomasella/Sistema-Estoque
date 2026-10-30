<script setup lang="ts">
import { Truck } from '@lucide/vue'
import { ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { DraftState } from '../composables/useSaleDraft'

/** Envio/entrega (RN-VEN-11): endereço, UF (usada no fiscal) e código de rastreio. */
const props = defineProps<{ shipping: DraftState['shipping'] }>()
const emit = defineEmits<{ update: [shipping: DraftState['shipping']] }>()

const set = (patch: Partial<DraftState['shipping']>) => emit('update', { ...props.shipping, ...patch })
const setAddress = (field: 'street' | 'city', value: string | number) =>
  set({ address: { ...props.shipping.address, [field]: String(value) || null } })

// UF só vai para o servidor completa (2 letras) ou vazia.
const uf = ref(props.shipping.uf ?? '')
watch(
  () => props.shipping.uf,
  (value) => value && (uf.value = value),
)
function setUf(value: string | number) {
  uf.value = String(value).toUpperCase()
  if (uf.value.length !== 1) set({ uf: uf.value || null })
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <Label for="shipping-on" class="flex items-center gap-2"><Truck class="size-4" /> Tem envio / entrega?</Label>
      <Switch id="shipping-on" :model-value="shipping.enabled" @update:model-value="set({ enabled: $event })" />
    </div>
    <div v-if="shipping.enabled" class="grid grid-cols-[1fr_5rem] gap-2">
      <div class="col-span-2 space-y-1">
        <Label for="ship-street" class="text-xs text-muted-foreground">Endereço</Label>
        <Input
          id="ship-street"
          :model-value="shipping.address?.street ?? ''"
          placeholder="Rua, número, complemento"
          @update:model-value="setAddress('street', $event)"
        />
      </div>
      <div class="space-y-1">
        <Label for="ship-city" class="text-xs text-muted-foreground">Cidade</Label>
        <Input
          id="ship-city"
          :model-value="shipping.address?.city ?? ''"
          @update:model-value="setAddress('city', $event)"
        />
      </div>
      <div class="space-y-1">
        <Label for="ship-uf" class="text-xs text-muted-foreground">UF</Label>
        <Input id="ship-uf" :model-value="uf" maxlength="2" class="uppercase" @update:model-value="setUf" />
      </div>
      <div class="col-span-2 space-y-1">
        <Label for="ship-tracking" class="text-xs text-muted-foreground">Código de rastreio (opcional)</Label>
        <Input
          id="ship-tracking"
          :model-value="shipping.trackingCode ?? ''"
          @update:model-value="set({ trackingCode: String($event) || null })"
        />
      </div>
    </div>
  </div>
</template>

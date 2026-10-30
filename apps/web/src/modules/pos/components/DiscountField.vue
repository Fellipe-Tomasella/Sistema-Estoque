<script setup lang="ts">
import { Tag } from '@lucide/vue'
import { ref, watch } from 'vue'
import MoneyInput from '@/components/common/MoneyInput.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { DraftState } from '../composables/useSaleDraft'

/** Desconto em R$ ou % no total (RN-VEN-04). Percentual vai em pontos-base (10,5% = 1050). */
const props = defineProps<{ discount: DraftState['discount']; discountCents: number }>()
const emit = defineEmits<{ update: [discount: DraftState['discount']] }>()

const kind = ref<'amount' | 'percent'>(props.discount.kind === 'percent' ? 'percent' : 'amount')
const percentText = ref(props.discount.kind === 'percent' ? String(props.discount.value / 100).replace('.', ',') : '')
watch(
  () => props.discount,
  (d) => {
    if (d.kind !== 'none') kind.value = d.kind
  },
)

const amount = () => (props.discount.kind === 'amount' ? props.discount.value : null)

function setAmount(cents: number | null | undefined) {
  emit('update', cents ? { kind: 'amount', value: cents } : { kind: 'none', value: 0 })
}
function setPercent(text: string | number) {
  percentText.value = String(text)
  const value = Math.round(Number(String(text).replace(',', '.')) * 100)
  emit('update', value > 0 && Number.isFinite(value) ? { kind: 'percent', value } : { kind: 'none', value: 0 })
}
function setKind(value: unknown) {
  if (value !== 'amount' && value !== 'percent') return
  kind.value = value
  percentText.value = ''
  emit('update', { kind: 'none', value: 0 })
}

const input = ref<HTMLElement | null>(null)
defineExpose({ focus: () => input.value?.querySelector('input')?.focus() })
</script>

<template>
  <div class="space-y-2">
    <p class="flex items-center justify-between text-sm font-medium">
      <span class="flex items-center gap-2"><Tag class="size-4" /> Desconto</span>
      <span v-if="discountCents > 0" class="text-xs text-emerald-700">
        <MoneyText :cents="discountCents" /> de desconto
      </span>
    </p>
    <div ref="input" class="flex gap-2">
      <ToggleGroup :model-value="kind" type="single" variant="outline" @update:model-value="setKind">
        <ToggleGroupItem value="amount" aria-label="Desconto em reais" class="px-3">R$</ToggleGroupItem>
        <ToggleGroupItem value="percent" aria-label="Desconto em porcentagem" class="px-3">%</ToggleGroupItem>
      </ToggleGroup>
      <MoneyInput v-if="kind === 'amount'" :model-value="amount()" class="flex-1" @update:model-value="setAmount" />
      <div v-else class="relative flex-1">
        <Input
          :model-value="percentText"
          inputmode="decimal"
          placeholder="0"
          class="pr-8"
          @update:model-value="setPercent"
        />
        <span class="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
    </div>
  </div>
</template>

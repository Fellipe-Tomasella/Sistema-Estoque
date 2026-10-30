<script setup lang="ts">
import type { AdjustmentReason } from '@estoque/shared'
import { ArrowRight, LoaderCircle, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { newIdempotencyKey } from '@/lib/api'
import { cn } from '@/lib/utils'
import VariantPicker from '@/modules/products/components/VariantPicker.vue'
import type { VariantSearchResult } from '@/modules/products/types'
import { useStockMutations, useVariant } from '../composables/useStock'

/**
 * Acerto de estoque. Contagem define o saldo (RN-EST-05: contou 5 com saldo 3 → fica 5, não 8);
 * perda/avaria/erro/outro tiram ou acrescentam, com motivo (RN-EST-06).
 */
const route = useRoute()
const router = useRouter()
const key = newIdempotencyKey()
const { createAdjustment } = useStockMutations()

const variant = ref<VariantSearchResult | null>(null)
const { data: preselected } = useVariant(() => route.query.variacao as string | undefined)
watch(preselected, (v) => v && !variant.value && (variant.value = v), { immediate: true })

const reasons: { value: AdjustmentReason; label: string }[] = [
  { value: 'count', label: 'Contagem' },
  { value: 'loss', label: 'Perda' },
  { value: 'damage', label: 'Avaria' },
  { value: 'error', label: 'Erro de lançamento' },
  { value: 'other', label: 'Outro' },
]
const reason = ref<AdjustmentReason>('count')
const direction = ref<'remove' | 'add'>('remove')
const counted = ref<number | null>(null)
const quantity = ref<number | null>(null)
const note = ref('')

const current = computed(() => variant.value?.stockQty ?? 0)
const delta = computed(() =>
  reason.value === 'count'
    ? (counted.value ?? current.value) - current.value
    : (quantity.value ?? 0) * (direction.value === 'remove' ? -1 : 1),
)
const after = computed(() => current.value + delta.value)
const invalid = computed(() => {
  if (!variant.value) return 'Escolha a peça.'
  if (reason.value === 'count') return counted.value === null ? 'Informe quantas peças você contou.' : null
  if (!quantity.value) return 'Informe a quantidade.'
  if (after.value < 0) return `Só há ${current.value} un; não dá para tirar ${quantity.value}.`
  if (reason.value === 'other' && !note.value.trim()) return 'Descreva o motivo na observação.'
  return null
})
const toInt = (value: string | number) => (value === '' ? null : Math.max(0, Math.floor(Number(value) || 0)))

async function save() {
  if (invalid.value) return toast.error(invalid.value)
  const result = await createAdjustment.mutateAsync({
    key,
    body: {
      variantId: variant.value!.id,
      reason: reason.value,
      ...(reason.value === 'count' ? { countedQty: counted.value! } : { quantityDelta: delta.value }),
      note: note.value.trim() || null,
    },
  })
  if (result.changed) toast.success(result.message)
  else toast.info(result.message)
  router.push(`/estoque/movimentos?variacao=${variant.value!.id}`)
}
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/produtos" class="hover:text-foreground">Produtos e estoque</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">Acerto de estoque</span>
  </nav>
  <PageHeader
    title="Acerto de estoque"
    description="Corrija o saldo por contagem, perda, avaria ou erro. Fica registrado no histórico."
  />

  <Card class="mx-auto max-w-2xl gap-6 p-5 shadow-sm">
    <div class="space-y-2">
      <Label>Peça</Label>
      <div v-if="variant" class="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
        <div>
          <p class="font-medium">{{ variant.productName }}</p>
          <p class="text-sm text-muted-foreground">{{ variant.label }} · saldo atual {{ variant.stockQty }} un</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Trocar peça" @click="variant = null"><X /></Button>
      </div>
      <VariantPicker v-else autofocus @select="variant = $event" />
    </div>

    <div class="space-y-2">
      <Label>Motivo</Label>
      <ToggleGroup v-model="reason" type="single" variant="outline" class="flex flex-wrap justify-start">
        <ToggleGroupItem v-for="r in reasons" :key="r.value" :value="r.value" class="px-3">{{
          r.label
        }}</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div v-if="reason === 'count'" class="space-y-2">
      <Label for="counted">Quantas peças você contou?</Label>
      <Input
        id="counted"
        type="number"
        min="0"
        class="w-40"
        :model-value="counted ?? ''"
        @update:model-value="counted = toInt($event)"
      />
    </div>
    <div v-else class="flex flex-wrap items-end gap-4">
      <div class="space-y-2">
        <Label>Tirar ou acrescentar</Label>
        <ToggleGroup v-model="direction" type="single" variant="outline">
          <ToggleGroupItem value="remove">Tirar</ToggleGroupItem>
          <ToggleGroupItem value="add">Acrescentar</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div class="space-y-2">
        <Label for="qty">Quantidade</Label>
        <Input
          id="qty"
          type="number"
          min="1"
          class="w-32"
          :model-value="quantity ?? ''"
          @update:model-value="quantity = toInt($event)"
        />
      </div>
    </div>

    <div class="space-y-2">
      <Label for="note">Observação {{ reason === 'other' ? '(obrigatória)' : '(opcional)' }}</Label>
      <Textarea id="note" v-model="note" rows="2" placeholder="Ex.: peça manchada na lavagem" />
    </div>

    <div v-if="variant" class="flex items-center justify-center gap-4 rounded-lg bg-muted/50 p-4 text-sm">
      <span
        >Saldo vai de <b class="tabular">{{ current }}</b></span
      >
      <ArrowRight class="size-4 text-muted-foreground" />
      <b :class="cn('text-lg tabular', after < 0 && 'text-red-700')">{{ after }}</b>
      <span
        :class="
          cn(
            'rounded-md px-2 py-0.5 font-semibold tabular',
            delta > 0 ? 'bg-emerald-100 text-emerald-800' : delta < 0 ? 'bg-red-100 text-red-700' : 'bg-muted',
          )
        "
      >
        {{ delta > 0 ? `+${delta}` : delta }}
      </span>
    </div>

    <div class="flex justify-end gap-2">
      <Button variant="secondary" @click="router.back()">Cancelar</Button>
      <Button :disabled="createAdjustment.isPending.value" @click="save">
        <LoaderCircle v-if="createAdjustment.isPending.value" class="animate-spin" /> Salvar acerto
      </Button>
    </div>
  </Card>
</template>

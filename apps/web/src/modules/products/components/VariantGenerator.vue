<script setup lang="ts">
import { compareSizes, formatBRL } from '@estoque/shared'
import { Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import MoneyInput from '@/components/common/MoneyInput.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProductSuggestions } from '../composables/useProducts'
import type { VariantDraft } from '../types'
import ChipInput from './ChipInput.vue'

/**
 * “Gerar combinações” (06 §3.2): escolhe cores × tamanhos e marca só as que a loja tem (RN-PRO-03).
 * Combinações que já existem no produto não aparecem (RN-PRO-02).
 */
const rows = defineModel<VariantDraft[]>({ required: true })
const props = defineProps<{ basePriceCents: number | null; existing?: { color: string; size: string }[] }>()

const { data: suggestions } = useProductSuggestions()
const colors = ref<string[]>([])
const sizes = ref<string[]>([])
const minForAll = ref<number | null>(null)

const presets = [
  { label: 'PP ao GG', values: ['PP', 'P', 'M', 'G', 'GG'] },
  { label: '34 ao 46', values: ['34', '36', '38', '40', '42', '44', '46'] },
  { label: 'Tamanho único', values: ['U'] },
]
const key = (color: string, size: string) => `${color.trim().toLowerCase()}|${size.trim().toLowerCase()}`
const existingKeys = computed(() => new Set((props.existing ?? []).map((v) => key(v.color, v.size))))

// Refaz a grade quando cores/tamanhos mudam, preservando o que já foi digitado em cada combinação.
watch([colors, sizes], () => {
  const previous = new Map(rows.value.map((row) => [key(row.color, row.size), row]))
  const next: VariantDraft[] = []
  for (const color of colors.value) {
    for (const size of [...sizes.value].sort(compareSizes)) {
      if (existingKeys.value.has(key(color, size))) continue
      next.push(
        previous.get(key(color, size)) ?? {
          color,
          size,
          enabled: true,
          priceCents: null,
          initialQty: 0,
          minStock: minForAll.value,
        },
      )
    }
  }
  rows.value = next
})

watch(minForAll, (value) => (rows.value = rows.value.map((row) => ({ ...row, minStock: value }))))

const enabledRows = computed(() => rows.value.filter((row) => row.enabled))
const allEnabled = computed({
  get: () => rows.value.length > 0 && enabledRows.value.length === rows.value.length,
  set: (on) => (rows.value = rows.value.map((row) => ({ ...row, enabled: on }))),
})
const toInt = (value: string | number) => Math.max(0, Math.floor(Number(value) || 0))
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-2 rounded-lg bg-muted/50 p-4">
      <Label>Cores</Label>
      <ChipInput v-model="colors" :suggestions="suggestions?.colors ?? []" placeholder="+ Outra cor" />
    </div>
    <div class="space-y-2 rounded-lg bg-muted/50 p-4">
      <Label>Tamanhos</Label>
      <ChipInput
        v-model="sizes"
        :suggestions="suggestions?.sizes ?? []"
        :presets="presets"
        placeholder="+ Outro tamanho"
      />
    </div>

    <div v-if="rows.length" class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="font-semibold">
          Combinações <span class="text-sm font-normal text-muted-foreground">({{ enabledRows.length }} marcadas)</span>
        </p>
        <div class="flex items-center gap-2 text-sm">
          <Label for="min-all" class="text-muted-foreground">Alerta mínimo para todas</Label>
          <Input
            id="min-all"
            type="number"
            min="0"
            class="h-8 w-20 text-right"
            :model-value="minForAll ?? ''"
            @update:model-value="minForAll = $event === '' ? null : toInt($event)"
          />
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full min-w-[560px] text-sm">
          <thead class="bg-muted/50 text-xs tracking-wider text-muted-foreground uppercase">
            <tr>
              <th class="w-10 p-2"><Checkbox v-model="allEnabled" aria-label="Marcar todas" /></th>
              <th class="p-2 text-left font-medium">Cor</th>
              <th class="p-2 text-left font-medium">Tam.</th>
              <th class="p-2 text-left font-medium">Preço</th>
              <th class="p-2 text-right font-medium">Qtd. inicial</th>
              <th class="p-2 text-right font-medium">Mín. alerta</th>
              <th class="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in rows"
              :key="`${row.color}|${row.size}`"
              :class="['border-t', !row.enabled && 'opacity-50']"
            >
              <td class="p-2"><Checkbox v-model="row.enabled" :aria-label="`Usar ${row.color} / ${row.size}`" /></td>
              <td class="p-2 font-medium">{{ row.color }}</td>
              <td class="p-2">
                <span class="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{{ row.size }}</span>
              </td>
              <td class="p-2">
                <MoneyInput
                  v-model="row.priceCents"
                  :disabled="!row.enabled"
                  :placeholder="
                    basePriceCents !== null ? formatBRL(basePriceCents).replace('R$', '').trim() : 'Preço base'
                  "
                  class="h-8 w-32"
                />
              </td>
              <td class="p-2">
                <Input
                  type="number"
                  min="0"
                  class="ml-auto h-8 w-20 text-right"
                  :disabled="!row.enabled"
                  :model-value="row.initialQty"
                  @update:model-value="row.initialQty = toInt($event)"
                />
              </td>
              <td class="p-2">
                <Input
                  type="number"
                  min="0"
                  class="ml-auto h-8 w-20 text-right"
                  :disabled="!row.enabled"
                  :model-value="row.minStock ?? ''"
                  @update:model-value="row.minStock = $event === '' ? null : toInt($event)"
                />
              </td>
              <td class="p-2">
                <button
                  type="button"
                  class="text-muted-foreground hover:text-red-700"
                  :aria-label="`Remover ${row.color} / ${row.size}`"
                  @click="rows.splice(i, 1)"
                >
                  <Trash2 class="size-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-muted-foreground">
        Preço vazio usa o preço base. Desmarque as combinações que a loja não tem — elas não são cadastradas.
      </p>
    </div>
    <p v-else class="text-sm text-muted-foreground">Escolha ao menos uma cor e um tamanho para gerar as combinações.</p>
  </div>
</template>

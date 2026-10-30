<script setup lang="ts">
import { compareSizes } from '@estoque/shared'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { Variant } from '../types'

/** Grade cor × tamanho com o saldo de cada combinação (RN-EST-11). Célula vazia = combinação não cadastrada. */
const props = defineProps<{ variants: Variant[] }>()
const emit = defineEmits<{ select: [variant: Variant] }>()

const colors = computed(() => [...new Set(props.variants.map((v) => v.color))])
const sizes = computed(() => [...new Set(props.variants.map((v) => v.size))].sort(compareSizes))
const cell = (color: string, size: string) => props.variants.find((v) => v.color === color && v.size === size)

const tone = (v: Variant) =>
  !v.active
    ? 'bg-muted text-muted-foreground line-through'
    : v.stockStatus === 'out'
      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      : v.stockStatus === 'low'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-xs text-muted-foreground">
          <th class="py-2 pr-3 text-left font-medium">Cor</th>
          <th v-for="size in sizes" :key="size" class="min-w-12 px-1 py-2 text-center font-medium">{{ size }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="color in colors" :key="color">
          <td class="py-1 pr-3 whitespace-nowrap">{{ color }}</td>
          <td v-for="size in sizes" :key="size" class="px-1 py-1">
            <button
              v-if="cell(color, size)"
              type="button"
              :class="cn('h-8 w-full rounded-md text-center font-semibold tabular', tone(cell(color, size)!))"
              :title="`${color} / ${size}: ${cell(color, size)!.stockQty} un`"
              @click="emit('select', cell(color, size)!)"
            >
              {{ cell(color, size)!.stockQty }}
            </button>
            <span v-else class="block h-8 rounded-md border border-dashed text-center leading-8 text-muted-foreground">
              –
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bg-red-200" /> Sem estoque</span>
      <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bg-amber-200" /> Repor</span>
      <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bg-emerald-200" /> Estoque ok</span>
    </div>
  </div>
</template>

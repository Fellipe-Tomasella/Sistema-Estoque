<script setup lang="ts">
import ProductThumb from '@/components/common/ProductThumb.vue'
import { LoaderCircle, Search } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { onClickOutside, refDebounced } from '@vueuse/core'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { client, unwrap } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { findByCode, looksLikeCode } from '@/modules/pos/composables/useBarcode'
import type { VariantSearchResult } from '../types'

/**
 * Busca de variação por “nome cor tamanho” (ex.: “blusa preta m”), com setas e Enter.
 * Usada em entradas, acertos e no PDV.
 */
const props = withDefaults(defineProps<{ placeholder?: string; autofocus?: boolean }>(), {
  placeholder: 'Buscar peça ou bipar o código (ex.: blusa preta m)',
})
const emit = defineEmits<{ select: [variant: VariantSearchResult] }>()

const term = ref('')
// espera curta entre teclas: o resultado aparece enquanto ainda digita
const debounced = refDebounced(term, 120)
const open = ref(false)
const highlighted = ref(0)
const root = useTemplateRef<HTMLElement>('root')
const input = useTemplateRef<{ $el: HTMLInputElement }>('input')
defineExpose({ focus: () => input.value?.$el.focus() })
onClickOutside(root, () => (open.value = false))

const { data, isFetching } = useQuery({
  queryKey: computed(() => ['search', 'variants', debounced.value]),
  queryFn: () => unwrap(client.variants.search.get({ query: { q: debounced.value, limit: 10 } })),
  enabled: computed(() => debounced.value.trim().length >= 2),
  // mantém a lista anterior enquanto busca a nova (não pisca “nenhuma peça”)
  placeholderData: (previous) => previous,
  staleTime: 30_000,
})
const results = computed(() => (debounced.value.trim().length >= 2 ? (data.value ?? []) : []))
watch(results, () => (highlighted.value = 0))

function choose(variant: VariantSearchResult | undefined) {
  if (!variant) return
  emit('select', variant)
  term.value = ''
  open.value = false
}

/** Enter com um código (leitor ou digitado): procura a peça exata antes de usar a lista. */
async function enter() {
  const text = term.value.trim()
  if (looksLikeCode(text)) {
    try {
      return choose(await findByCode(text))
    } catch {
      // não é código de nenhuma peça: segue com o resultado da busca
    }
  }
  choose(results.value[highlighted.value])
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') highlighted.value = Math.min(highlighted.value + 1, results.value.length - 1)
  else if (event.key === 'ArrowUp') highlighted.value = Math.max(highlighted.value - 1, 0)
  else if (event.key === 'Enter') enter()
  else if (event.key === 'Escape') open.value = false
  else return
  event.preventDefault()
}
</script>

<template>
  <div ref="root" class="relative">
    <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      ref="input"
      v-model="term"
      :placeholder="props.placeholder"
      :autofocus="props.autofocus"
      class="h-10 pl-9"
      role="combobox"
      :aria-expanded="open && results.length > 0"
      @focus="open = true"
      @input="open = true"
      @keydown="onKey"
    />
    <LoaderCircle
      v-if="isFetching"
      class="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
    />
    <ul
      v-if="open && term.trim().length >= 2"
      class="absolute inset-x-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
      role="listbox"
    >
      <li
        v-if="!results.length && (isFetching || term !== debounced)"
        class="px-3 py-4 text-center text-sm text-muted-foreground"
      >
        Buscando…
      </li>
      <li v-else-if="!results.length" class="px-3 py-4 text-center text-sm text-muted-foreground">
        Nenhuma peça encontrada. Confira o nome ou tente só uma palavra.
      </li>
      <li
        v-for="(variant, i) in results"
        :key="variant.id"
        role="option"
        :aria-selected="i === highlighted"
        :class="
          cn('flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm', i === highlighted && 'bg-muted')
        "
        @mouseenter="highlighted = i"
        @mousedown.prevent="choose(variant)"
      >
        <ProductThumb :src="variant.coverUrl" class="size-9" />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">{{ variant.productName }}</span>
          <span class="text-xs text-muted-foreground">{{ variant.label }}</span>
        </span>
        <span class="text-right text-xs tabular">
          <span class="block font-medium">{{ formatBRL(variant.effectivePriceCents) }}</span>
          <span :class="variant.stockQty === 0 ? 'text-red-700' : 'text-muted-foreground'"
            >{{ variant.stockQty }} un</span
          >
        </span>
      </li>
    </ul>
  </div>
</template>

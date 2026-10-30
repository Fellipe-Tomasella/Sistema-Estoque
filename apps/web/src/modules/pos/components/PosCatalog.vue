<script setup lang="ts">
import { Shirt } from '@lucide/vue'
import { computed, ref, useTemplateRef } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import VariantPicker from '@/modules/products/components/VariantPicker.vue'
import { useProductList, useProductSuggestions } from '@/modules/products/composables/useProducts'
import type { Variant, VariantSearchResult } from '@/modules/products/types'
import CatalogCard from './CatalogCard.vue'

/** Catálogo do PDV: busca direta (Enter adiciona) e produtos por categoria com chips de cor/tamanho. */
const emit = defineEmits<{
  pick: [variant: VariantSearchResult]
  add: [productName: string, variant: Variant, quantity: number]
}>()

const category = ref<string | undefined>(undefined)
const { data: suggestions } = useProductSuggestions()
const { data, isPending } = useProductList(() => ({
  status: 'active' as const,
  category: category.value,
  pageSize: 30,
}))
const products = computed(() => (data.value?.items ?? []).filter((p) => p.variants.some((v) => v.active)))

const picker = useTemplateRef<{ focus: () => void }>('picker')
defineExpose({ focus: () => picker.value?.focus() })
</script>

<template>
  <div class="space-y-4">
    <Card class="gap-3 p-4 shadow-sm">
      <VariantPicker ref="picker" @select="emit('pick', $event)" />
      <div v-if="suggestions?.categories.length" class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-muted-foreground">Filtro:</span>
        <button
          v-for="c in [undefined, ...suggestions.categories]"
          :key="c ?? 'all'"
          type="button"
          :class="
            cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              c === category ? 'bg-brand text-brand-foreground' : 'bg-muted hover:bg-muted/70',
            )
          "
          @click="category = c"
        >
          {{ c ?? 'Todos' }}
        </button>
      </div>
      <p class="hidden text-xs text-muted-foreground lg:block">
        Atalhos: <kbd class="rounded border px-1">/</kbd> buscar · <kbd class="rounded border px-1">F2</kbd> desconto ·
        <kbd class="rounded border px-1">F4</kbd> pagamento ·
        <kbd class="rounded border px-1">Ctrl+Enter</kbd> confirmar
      </p>
    </Card>

    <div v-if="isPending" class="grid gap-3 xl:grid-cols-2"><Skeleton v-for="i in 4" :key="i" class="h-40" /></div>
    <EmptyState
      v-else-if="!products.length"
      :icon="Shirt"
      title="Nenhum produto ativo"
      description="Cadastre produtos para vender por aqui."
    />
    <div v-else class="grid gap-3 xl:grid-cols-2">
      <CatalogCard
        v-for="p in products"
        :key="p.id"
        :product="p"
        @add="(variant, quantity) => emit('add', p.name, variant, quantity)"
      />
    </div>
  </div>
</template>

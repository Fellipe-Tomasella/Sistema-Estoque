<script setup lang="ts">
import { Minus, Plus, ShoppingCart } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Product, Variant } from '@/modules/products/types'

/** Produto do catálogo do PDV: escolhe cor e tamanho em chips (com o saldo de cada um) e adiciona. */
const props = defineProps<{ product: Product }>()
const emit = defineEmits<{ add: [variant: Variant, quantity: number] }>()

const variants = computed(() => props.product.variants.filter((v) => v.active))
const colors = computed(() => [...new Set(variants.value.map((v) => v.color))])
const color = ref(colors.value[0] ?? '')
const sizes = computed(() => variants.value.filter((v) => v.color === color.value))
const chosen = ref<Variant | null>(null)
const quantity = ref(1)

// Troca de cor: pré-escolhe o primeiro tamanho com saldo.
watch(sizes, (list) => (chosen.value = list.length === 1 ? list[0]! : (list.find((v) => v.stockQty > 0) ?? null)), {
  immediate: true,
})

function add() {
  if (!chosen.value) return
  emit('add', chosen.value, quantity.value)
  quantity.value = 1
}
</script>

<template>
  <Card class="gap-3 p-4 shadow-sm">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-semibold">{{ product.name }}</p>
        <p class="text-xs text-muted-foreground">{{ product.category ?? 'Sem categoria' }}</p>
      </div>
      <p class="text-lg font-semibold whitespace-nowrap">
        <MoneyText :cents="chosen?.effectivePriceCents ?? product.basePriceCents" />
      </p>
    </div>

    <div v-if="colors.length > 1" class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-muted-foreground">Cor:</span>
      <button
        v-for="c in colors"
        :key="c"
        type="button"
        :class="
          cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            c === color ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
          )
        "
        @click="color = c"
      >
        {{ c }}
      </button>
    </div>
    <p v-else class="text-xs text-muted-foreground">Cor: {{ color }}</p>

    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="v in sizes"
        :key="v.id"
        type="button"
        :disabled="v.stockQty <= 0 && chosen?.id !== v.id"
        :title="v.stockQty <= 0 ? 'Sem estoque' : undefined"
        :class="
          cn(
            'flex min-w-12 flex-col items-center rounded-md border px-2 py-1 text-xs leading-tight transition-colors',
            chosen?.id === v.id ? 'border-brand bg-brand text-brand-foreground' : 'hover:bg-muted',
            v.stockQty <= 0 && 'cursor-not-allowed opacity-50',
          )
        "
        @click="chosen = v"
      >
        <span class="font-semibold">{{ v.size }}</span>
        <span :class="chosen?.id === v.id ? '' : v.stockQty <= 0 ? 'text-red-700' : 'text-muted-foreground'">
          {{ v.stockQty <= 0 ? 'sem estoque' : `${v.stockQty} un` }}
        </span>
      </button>
    </div>

    <div class="flex items-center justify-end gap-2">
      <div class="flex items-center rounded-md border">
        <Button variant="ghost" size="icon-sm" aria-label="Menos" :disabled="quantity <= 1" @click="quantity--">
          <Minus />
        </Button>
        <span class="w-7 text-center text-sm tabular">{{ quantity }}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Mais" @click="quantity++"><Plus /></Button>
      </div>
      <Button class="bg-brand text-brand-foreground hover:bg-brand/90" :disabled="!chosen" @click="add">
        <ShoppingCart /> Adicionar
      </Button>
    </div>
  </Card>
</template>

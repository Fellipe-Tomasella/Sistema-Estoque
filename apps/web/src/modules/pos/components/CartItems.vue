<script setup lang="ts">
import { Minus, Plus, ShoppingBag, Trash2 } from '@lucide/vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { pieces } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DraftState } from '../composables/useSaleDraft'

/** Itens do carrinho: quantidade, remover e aviso de saldo (RN-VEN-06 avisa, não bloqueia). */
const props = defineProps<{ state: DraftState }>()
const emit = defineEmits<{ change: [mutator: (state: DraftState) => void] }>()

const total = () => props.state.items.reduce((sum, i) => sum + i.quantity, 0)
const setQty = (index: number, quantity: number) =>
  emit('change', (s) => (quantity <= 0 ? s.items.splice(index, 1) : (s.items[index]!.quantity = quantity)))
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Itens ({{ pieces(total()) }})</p>
      <button
        v-if="state.items.length"
        type="button"
        class="flex items-center gap-1 text-xs font-medium text-red-700 hover:underline"
        @click="emit('change', (s) => s.items.splice(0))"
      >
        <Trash2 class="size-3.5" /> Limpar
      </button>
    </div>
    <div
      v-if="!state.items.length"
      class="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      <ShoppingBag class="size-6" />
      Busque uma peça ou escolha no catálogo.
    </div>
    <div v-for="(item, index) in state.items" :key="item.variantId" class="rounded-lg bg-muted/60 p-3">
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">{{ item.productName }}</p>
          <p class="text-xs text-muted-foreground">
            {{ item.variantLabel }} · <MoneyText :cents="item.unitPriceCents" /> un
          </p>
        </div>
        <p class="font-semibold whitespace-nowrap"><MoneyText :cents="item.unitPriceCents * item.quantity" /></p>
      </div>
      <div class="mt-2 flex items-center justify-between">
        <p :class="cn('text-xs', item.quantity > item.availableQty ? 'text-amber-700' : 'text-muted-foreground')">
          {{
            item.quantity > item.availableQty ? `Só ${item.availableQty} em estoque` : `${item.availableQty} em estoque`
          }}
        </p>
        <div class="flex items-center gap-1">
          <div class="flex items-center rounded-md border bg-card">
            <Button variant="ghost" size="icon-sm" aria-label="Menos" @click="setQty(index, item.quantity - 1)">
              <Minus />
            </Button>
            <span class="w-7 text-center text-sm tabular">{{ item.quantity }}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Mais" @click="setQty(index, item.quantity + 1)">
              <Plus />
            </Button>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Remover" @click="setQty(index, 0)">
            <Trash2 class="text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

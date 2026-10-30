<script setup lang="ts">
import { ShoppingBag } from '@lucide/vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Card } from '@/components/ui/card'
import { pieces } from '@/lib/format'
import type { SaleDetail } from '../composables/useSales'

/** Itens com o preço gravado na confirmação, devolvidos e o resumo de totais. */
const props = defineProps<{ sale: SaleDetail }>()
const count = () => props.sale.items.reduce((sum, i) => sum + i.quantity, 0)
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold">
      <ShoppingBag class="size-4 text-brand" /> Itens
      <span class="text-xs font-normal text-muted-foreground">{{ pieces(count()) }}</span>
    </h2>
    <div class="divide-y">
      <div v-for="item in sale.items" :key="item.variantId" class="flex items-start gap-3 py-2.5 text-sm">
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ item.productName }}</p>
          <p class="text-xs text-muted-foreground">
            {{ item.variantLabel }} · {{ item.quantity }} × <MoneyText :cents="item.unitPriceCents" />
            <span v-if="item.returnedQty" class="text-amber-700"> · {{ item.returnedQty }} devolvida(s)</span>
          </p>
        </div>
        <div class="text-right">
          <p class="font-medium"><MoneyText :cents="item.lineTotalCents" /></p>
          <p v-if="item.discountAllocatedCents" class="text-xs text-muted-foreground line-through">
            <MoneyText :cents="item.lineSubtotalCents" />
          </p>
        </div>
      </div>
    </div>
    <div class="space-y-1 rounded-lg bg-muted/60 p-4 text-sm">
      <p class="flex justify-between text-muted-foreground">Subtotal <MoneyText :cents="sale.subtotalCents" /></p>
      <p v-if="sale.discountCents" class="flex justify-between text-emerald-700">
        Desconto <span>− <MoneyText :cents="sale.discountCents" /></span>
      </p>
      <p class="flex items-end justify-between pt-1">
        <span class="font-medium">Total</span>
        <span class="text-2xl font-semibold text-brand"><MoneyText :cents="sale.totalCents" /></span>
      </p>
    </div>
  </Card>
</template>

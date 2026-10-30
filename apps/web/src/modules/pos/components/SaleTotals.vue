<script setup lang="ts">
import { CircleAlert, LoaderCircle, ShoppingCart, TriangleAlert } from '@lucide/vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/format'
import type { SaleView } from '../composables/useSaleDraft'

/** Rodapé do PDV: totais, avisos (não impedem) e bloqueios (impedem) vindos do servidor (RN-VEN-06). */
const props = defineProps<{ view: SaleView | null; busy: boolean; confirming: boolean }>()
const emit = defineEmits<{ confirm: [] }>()
const change = () =>
  (props.view?.payments ?? []).reduce((sum, p) => sum + ('changeCents' in p ? (p.changeCents ?? 0) : 0), 0)
</script>

<template>
  <div class="space-y-3 rounded-xl bg-muted/70 p-4">
    <div class="space-y-1 text-sm">
      <p class="flex justify-between text-muted-foreground">Subtotal <MoneyText :cents="view?.subtotalCents ?? 0" /></p>
      <p v-if="view?.discountCents" class="flex justify-between text-emerald-700">
        Desconto <span>− <MoneyText :cents="view.discountCents" /></span>
      </p>
      <p class="flex items-end justify-between pt-1">
        <span class="font-medium">Total</span>
        <span class="text-3xl font-semibold"><MoneyText :cents="view?.totalCents ?? 0" /></span>
      </p>
    </div>
    <div v-if="view && (view.paidCents || view.fiado.cents)" class="grid grid-cols-2 gap-2 text-xs">
      <div class="rounded-lg bg-emerald-50 p-2 text-emerald-800">
        <p class="font-medium uppercase">Pago agora</p>
        <p class="text-base font-semibold"><MoneyText :cents="view.paidCents" /></p>
      </div>
      <div v-if="view.fiado.cents" class="rounded-lg bg-brand-soft p-2 text-brand">
        <p class="font-medium uppercase">No fiado</p>
        <p class="text-base font-semibold"><MoneyText :cents="view.fiado.cents" /></p>
      </div>
      <div v-else-if="change()" class="rounded-lg bg-amber-50 p-2 text-amber-800">
        <p class="font-medium uppercase">Troco</p>
        <p class="text-base font-semibold"><MoneyText :cents="change()" /></p>
      </div>
    </div>

    <ul v-if="view?.warnings.length" class="space-y-1">
      <li v-for="w in view.warnings" :key="w" class="flex gap-2 text-xs text-amber-800">
        <TriangleAlert class="size-3.5 shrink-0" /> {{ w }}
      </li>
    </ul>
    <ul v-if="view?.blockers.length" class="space-y-1" data-testid="blockers">
      <li v-for="b in view.blockers" :key="b" class="flex gap-2 text-xs text-red-700">
        <CircleAlert class="size-3.5 shrink-0" /> {{ b }}
      </li>
    </ul>

    <Button
      class="h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90"
      :disabled="!view?.canConfirm || busy || confirming"
      @click="emit('confirm')"
    >
      <LoaderCircle v-if="confirming" class="animate-spin" /><ShoppingCart v-else />
      {{ view?.totalCents ? `Confirmar venda (${formatBRL(view.totalCents)})` : 'Confirmar venda' }}
    </Button>
  </div>
</template>

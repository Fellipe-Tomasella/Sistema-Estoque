<script setup lang="ts">
import { ArrowLeft, ArrowRight, CloudCheck, LoaderCircle, LogOut, ShoppingBag } from '@lucide/vue'
import { onKeyStroke, useMediaQuery } from '@vueuse/core'
import { computed, ref, toRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL, pieces } from '@/lib/format'
import { addItem, addSearchResult, totalOf } from '../cart'
import { addByCode, useBarcodeScanner } from '../composables/useBarcode'
import CartItems from './CartItems.vue'
import CustomerPicker from './CustomerPicker.vue'
import DiscountField from './DiscountField.vue'
import PaymentsSection from './PaymentsSection.vue'
import PosCatalog from './PosCatalog.vue'
import SaleDone from './SaleDone.vue'
import SaleTotals from './SaleTotals.vue'
import ShippingFields from './ShippingFields.vue'
import { useSaleDraft } from '../composables/useSaleDraft'

/**
 * PDV clássico (decisão 041): tela cheia, sem menu. Passo 1 só produtos e itens; passo 2 cliente, envio,
 * desconto e pagamento. Usa o mesmo rascunho no servidor da “Nova venda” (RN-VEN-01).
 * Remontado a cada venda (`:key`), então começa sempre limpo.
 */
const props = defineProps<{ id: string }>()
const router = useRouter()
const draftId = toRef(props, 'id')

const { state, view, query, saving, pending, change, confirm } = useSaleDraft(draftId)
const wide = useMediaQuery('(min-width: 1024px)')
const step = ref<'items' | 'payment'>('items')

const busy = computed(() => saving.value || pending.value)
const itemCount = computed(() => state.items.reduce((sum, i) => sum + i.quantity, 0))
const confirming = ref(false)
const catalog = useTemplateRef<{ focus: () => void }>('catalog')

function toPayment() {
  if (state.items.length) step.value = 'payment'
}
function askConfirm() {
  if (step.value === 'payment' && view.value?.canConfirm && !busy.value) confirming.value = true
}
async function doConfirm() {
  await confirm.mutateAsync()
  confirming.value = false
}

/** Leitor de código (USB) e câmera: a peça bipada entra direto no carrinho. */
const scan = (code: string, quiet = false) => addByCode(code, (v) => change((s) => addSearchResult(s, v)), quiet)
useBarcodeScanner(scan)

const typing = (e: KeyboardEvent) => (e.target as Element | null)?.closest?.('input, textarea, [contenteditable]')
onKeyStroke('/', (e) => {
  if (typing(e) || step.value !== 'items') return
  e.preventDefault()
  catalog.value?.focus()
})
onKeyStroke('F4', (e) => {
  e.preventDefault()
  toPayment()
})
onKeyStroke('Escape', () => {
  if (step.value === 'payment' && !confirming.value) step.value = 'items'
})
onKeyStroke('Enter', (e) => {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  askConfirm()
})
</script>

<template>
  <div class="flex min-h-svh flex-col bg-background">
    <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 lg:px-6">
      <div class="flex items-center gap-2 font-semibold">
        <span class="flex size-8 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <ShoppingBag class="size-4" />
        </span>
        PDV
      </div>
      <p class="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" aria-live="polite">
        <template v-if="busy"><LoaderCircle class="size-3.5 animate-spin" /> Salvando…</template>
        <template v-else><CloudCheck class="size-3.5 text-emerald-600" /> Venda salva como rascunho</template>
      </p>
      <div class="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" as-child class="hidden sm:inline-flex">
          <RouterLink to="/vender?lista=1">Rascunhos</RouterLink>
        </Button>
        <Button variant="outline" size="sm" as-child>
          <RouterLink to="/"><LogOut /> Sair do PDV</RouterLink>
        </Button>
      </div>
    </header>

    <div v-if="query.isPending.value" class="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_400px] lg:p-6">
      <Skeleton class="h-96" /><Skeleton class="h-96" />
    </div>

    <div v-else-if="view && view.status !== 'draft'" class="p-4 lg:p-6">
      <SaleDone :sale="view" @next="router.push('/pdv')" />
    </div>

    <!-- Passo 1: só produtos e o que já foi escolhido -->
    <main v-else-if="step === 'items'" class="grid flex-1 gap-4 p-4 pb-28 lg:grid-cols-[1fr_400px] lg:p-6">
      <PosCatalog
        ref="catalog"
        :scan="(code: string) => scan(code, true)"
        @pick="(v) => change((s) => addSearchResult(s, v))"
        @add="(name, v, qty) => change((s) => addItem(s, name, v, qty))"
      />
      <Card v-if="wide" class="gap-4 p-4 shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100svh-6.5rem)] lg:self-start">
        <div class="min-h-0 flex-1 overflow-y-auto"><CartItems :state="state" @change="change" /></div>
        <Separator />
        <div class="flex items-baseline justify-between">
          <span class="text-sm text-muted-foreground">Total ({{ pieces(itemCount) }})</span>
          <span class="text-2xl font-semibold"><MoneyText :cents="totalOf(state)" /></span>
        </div>
        <Button
          size="lg"
          class="h-12 bg-brand text-base text-brand-foreground hover:bg-brand/90"
          :disabled="!state.items.length"
          @click="toPayment"
        >
          Ir para pagamento <kbd class="ml-1 rounded border border-white/40 px-1 text-xs">F4</kbd> <ArrowRight />
        </Button>
      </Card>
    </main>

    <!-- Passo 2: cliente, envio, desconto e pagamento -->
    <main v-else class="grid flex-1 gap-4 p-4 pb-28 lg:grid-cols-[1fr_420px] lg:p-6">
      <div class="space-y-4">
        <Button variant="ghost" class="-ml-2" @click="step = 'items'">
          <ArrowLeft /> Voltar aos produtos <kbd class="ml-1 hidden rounded border px-1 text-xs lg:inline">Esc</kbd>
        </Button>
        <Card class="gap-5 p-4 shadow-sm">
          <CustomerPicker
            :model-value="state.customerId"
            @update:model-value="(id) => change((s) => (s.customerId = id))"
          />
          <Separator />
          <ShippingFields :shipping="state.shipping" @update="(v) => change((s) => (s.shipping = v))" />
          <Separator />
          <DiscountField
            :discount="state.discount"
            :discount-cents="view?.discountCents ?? 0"
            @update="(d) => change((s) => (s.discount = d))"
          />
        </Card>
        <Card class="gap-3 p-4 shadow-sm"><CartItems :state="state" @change="change" /></Card>
      </div>
      <Card class="gap-5 p-4 shadow-sm lg:sticky lg:top-20 lg:self-start">
        <PaymentsSection :state="state" :view="view" @change="change" />
        <SaleTotals :view="view" :busy="busy" :confirming="confirm.isPending.value" @confirm="askConfirm" />
      </Card>
    </main>

    <!-- Celular (e itens no notebook estreito): total e próximo passo fixos embaixo -->
    <div
      v-if="view?.status === 'draft' && step === 'items' && !wide"
      class="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur"
    >
      <p class="flex-1 text-sm">
        {{ pieces(itemCount) }} · <strong><MoneyText :cents="totalOf(state)" /></strong>
      </p>
      <Button
        class="bg-brand text-brand-foreground hover:bg-brand/90"
        :disabled="!state.items.length"
        @click="toPayment"
      >
        Pagamento <ArrowRight />
      </Button>
    </div>

    <ConfirmDialog
      v-model:open="confirming"
      :title="`Confirmar venda de ${formatBRL(view?.totalCents ?? 0)}?`"
      confirm-label="Confirmar venda"
      :loading="confirm.isPending.value"
      @confirm="doConfirm"
    >
      {{ pieces(itemCount) }} saem do estoque.
    </ConfirmDialog>
  </div>
</template>

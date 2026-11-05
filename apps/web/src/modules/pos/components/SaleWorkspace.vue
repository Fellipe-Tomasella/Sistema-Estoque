<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, CloudCheck, LoaderCircle, ShoppingBag } from '@lucide/vue'
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
import { cn } from '@/lib/utils'
import { useCustomer } from '@/modules/customers/composables/useCustomers'
import { addItem, addSearchResult, totalOf } from '../cart'
import { addByCode, useBarcodeScanner } from '../composables/useBarcode'
import { useSaleDraft } from '../composables/useSaleDraft'
import CartItems from './CartItems.vue'
import CustomerPicker from './CustomerPicker.vue'
import DiscountField from './DiscountField.vue'
import PaymentsSection from './PaymentsSection.vue'
import PosCatalog from './PosCatalog.vue'
import SaleDone from './SaleDone.vue'
import SaleTotals from './SaleTotals.vue'
import ShippingFields from './ShippingFields.vue'

/**
 * PDV (06 §PDV): no notebook, catálogo à esquerda e venda à direita; no celular, em passos.
 * Tudo que muda vai para o rascunho no servidor; quem calcula total, avisos e bloqueios é a API.
 */
const props = defineProps<{ id: string }>()
const router = useRouter()
const { state, view, query, saving, pending, change, confirm } = useSaleDraft(toRef(props, 'id'))
const wide = useMediaQuery('(min-width: 1024px)')
const { data: customer } = useCustomer(() => state.customerId ?? '')

const steps = ['Itens', 'Cliente e envio', 'Pagamento', 'Conferir'] as const
const step = ref(0)
const confirming = ref(false)
const busy = computed(() => saving.value || pending.value)
const itemCount = computed(() => state.items.reduce((sum, i) => sum + i.quantity, 0))

const catalog = useTemplateRef<{ focus: () => void }>('catalog')
const discount = useTemplateRef<{ focus: () => void }>('discount')
const payments = useTemplateRef<HTMLElement>('payments')

function askConfirm() {
  if (view.value?.canConfirm && !busy.value) confirming.value = true
}
async function doConfirm() {
  await confirm.mutateAsync()
  confirming.value = false
}

// Atalhos de teclado (notebook).
/** Leitor de código (USB) e câmera: a peça bipada entra direto no carrinho. */
const scan = (code: string) => addByCode(code, (v) => change((s) => addSearchResult(s, v)))
useBarcodeScanner(scan)

const typing = (e: KeyboardEvent) => (e.target as Element | null)?.closest?.('input, textarea, [contenteditable]')
onKeyStroke('/', (e) => {
  if (typing(e)) return
  e.preventDefault()
  catalog.value?.focus()
})
onKeyStroke('F2', (e) => {
  e.preventDefault()
  if (!wide.value) step.value = 2
  discount.value?.focus()
})
onKeyStroke('F4', (e) => {
  e.preventDefault()
  if (!wide.value) step.value = 2
  payments.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  payments.value?.querySelector<HTMLElement>('button[data-method]:not([disabled])')?.focus()
})
onKeyStroke('Enter', (e) => {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  askConfirm()
})
</script>

<template>
  <div v-if="query.isPending.value" class="grid gap-4 lg:grid-cols-[1fr_420px]">
    <Skeleton class="h-96" /><Skeleton class="h-96" />
  </div>

  <SaleDone v-else-if="view && view.status !== 'draft'" :sale="view" @next="router.push('/vender?nova=1')" />

  <template v-else>
    <div class="mb-4 flex items-center justify-between gap-2">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Nova venda</h1>
        <p class="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          <template v-if="busy"><LoaderCircle class="size-3.5 animate-spin" /> Salvando…</template>
          <template v-else><CloudCheck class="size-3.5 text-emerald-600" /> Rascunho salvo</template>
        </p>
      </div>
      <Button variant="outline" size="sm" as-child>
        <RouterLink to="/vender?lista=1">Rascunhos</RouterLink>
      </Button>
    </div>

    <!-- Celular: indicador de passos -->
    <div v-if="!wide" class="mb-4">
      <p class="mb-2 text-sm font-medium">Passo {{ step + 1 }} de {{ steps.length }}: {{ steps[step] }}</p>
      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="(label, i) in steps"
          :key="label"
          type="button"
          :aria-label="label"
          :class="cn('h-1.5 rounded-full', i < step ? 'bg-emerald-600' : i === step ? 'bg-brand' : 'bg-muted')"
          @click="step = i"
        />
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_420px]">
      <PosCatalog
        v-if="wide || step === 0"
        ref="catalog"
        @pick="(v) => change((s) => addSearchResult(s, v))"
        @code="scan"
        @add="(name, v, qty) => change((s) => addItem(s, name, v, qty))"
      />

      <Card class="gap-5 p-4 shadow-sm lg:sticky lg:top-20 lg:self-start">
        <h2 v-if="wide" class="flex items-center gap-2 font-semibold"><ShoppingBag class="size-4" /> Venda</h2>
        <CartItems v-if="wide || step === 0 || step === 3" :state="state" @change="change" />

        <template v-if="wide || step === 1">
          <Separator v-if="wide" />
          <CustomerPicker
            :model-value="state.customerId"
            @update:model-value="(id) => change((s) => (s.customerId = id))"
          />
          <Separator />
          <ShippingFields :shipping="state.shipping" @update="(v) => change((s) => (s.shipping = v))" />
        </template>

        <template v-if="wide || step === 2">
          <Separator v-if="wide" />
          <DiscountField
            ref="discount"
            :discount="state.discount"
            :discount-cents="view?.discountCents ?? 0"
            @update="(d) => change((s) => (s.discount = d))"
          />
          <Separator />
          <div ref="payments"><PaymentsSection :state="state" :view="view" @change="change" /></div>
        </template>

        <SaleTotals
          v-if="wide || step === 3"
          :view="view"
          :busy="busy"
          :confirming="confirm.isPending.value"
          @confirm="askConfirm"
        />
      </Card>
    </div>

    <!-- Celular: navegação entre passos, fixa acima das abas -->
    <template v-if="!wide">
      <div class="h-20" />
      <div
        class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 border-t bg-card/95 p-3 backdrop-blur md:bottom-0"
      >
        <Button v-if="step > 0" variant="outline" @click="step--"><ArrowLeft /> Voltar</Button>
        <p v-else class="flex-1 text-sm">
          {{ pieces(itemCount) }} · <strong><MoneyText :cents="totalOf(state)" /></strong>
        </p>
        <Button v-if="step < 3" class="ml-auto bg-brand text-brand-foreground hover:bg-brand/90" @click="step++">
          {{ step === 0 ? 'Continuar' : steps[step + 1] }} <ArrowRight />
        </Button>
      </div>
    </template>

    <ConfirmDialog
      v-model:open="confirming"
      :title="`Confirmar venda de ${formatBRL(view?.totalCents ?? 0)}?`"
      confirm-label="Confirmar venda"
      :loading="confirm.isPending.value"
      @confirm="doConfirm"
    >
      <span class="block space-y-1">
        <span class="block">{{ pieces(itemCount) }} saem do estoque.</span>
        <span v-for="p in view?.payments ?? []" :key="p.id" class="block">
          <Check class="inline size-3.5 text-emerald-600" />
          {{ p.method === 'pix' ? 'Pix' : p.method === 'card' ? 'Cartão' : 'Dinheiro' }}
          <MoneyText :cents="p.amountCents" />
        </span>
        <span v-if="view?.fiado.cents" class="block">
          Fiado <MoneyText :cents="view.fiado.cents" /> para {{ customer?.name }}
        </span>
      </span>
    </ConfirmDialog>
  </template>
</template>

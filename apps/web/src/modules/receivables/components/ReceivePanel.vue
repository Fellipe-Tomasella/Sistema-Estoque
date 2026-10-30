<script setup lang="ts">
import type { MoneyMethod } from '@estoque/shared'
import { ArrowLeftRight, Banknote, Check, CreditCard, FileText, LoaderCircle, QrCode, WandSparkles } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import MoneyInput from '@/components/common/MoneyInput.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { newIdempotencyKey } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { useCustomer } from '@/modules/customers/composables/useCustomers'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import { useReceivableMutations } from '../composables/useReceivables'

/**
 * Registrar recebimento de fiado (RN-FIA-04…09): valor, forma e data; o sistema sugere abater das dívidas
 * mais antigas e a dona pode redistribuir. Mostra o saldo que fica antes de salvar.
 */
const props = defineProps<{ customerId: string }>()
const emit = defineEmits<{ done: [] }>()

const { data: customer } = useCustomer(() => props.customerId)
const { data: dashboard } = useDashboard()
const { preview, receive } = useReceivableMutations()

let key = newIdempotencyKey()
const amount = ref<number | null>(null)
const method = ref<MoneyMethod>('pix')
const date = ref('')
const manual = ref<Record<string, number | null> | null>(null)
const lastReceiptId = ref<string | null>(null)
const today = computed(() => dashboard.value?.today ?? new Date().toISOString().slice(0, 10))
watch(today, (value) => (date.value ||= value), { immediate: true })

// Troca de cliente: começa do zero.
watch(
  () => props.customerId,
  () => {
    amount.value = null
    manual.value = null
    lastReceiptId.value = null
    preview.reset()
  },
)

const allocations = computed(() =>
  manual.value
    ? Object.entries(manual.value)
        .filter(([, cents]) => (cents ?? 0) > 0)
        .map(([receivableId, cents]) => ({ receivableId, amountCents: cents! }))
    : undefined,
)

// Recalcula a prévia quando o valor ou a distribuição mudam.
watchDebounced(
  [amount, allocations],
  () => {
    if (!amount.value) return preview.reset()
    preview.mutate({ customerId: props.customerId, amountCents: amount.value, allocations: allocations.value })
  },
  { debounce: 300, deep: true },
)

const allocatedOf = (receivableId: string) =>
  manual.value
    ? (manual.value[receivableId] ?? null)
    : (preview.data.value?.allocations.find((a) => a.receivableId === receivableId)?.amountCents ?? 0)

function editLine(receivableId: string, cents: number | null) {
  // A primeira edição parte da sugestão automática.
  manual.value ??= Object.fromEntries((preview.data.value?.lines ?? []).map((l) => [l.receivableId, l.allocatedCents]))
  manual.value = { ...manual.value, [receivableId]: cents }
}

function payAll() {
  manual.value = null
  amount.value = customer.value?.openBalanceCents ?? null
}

const canSave = computed(() =>
  Boolean(amount.value && preview.data.value && !preview.error.value && !preview.isPending.value),
)

async function save() {
  if (!canSave.value) return
  const result = await receive.mutateAsync({
    key,
    body: {
      customerId: props.customerId,
      date: date.value,
      method: method.value,
      amountCents: amount.value!,
      allocations: preview.data.value!.allocations,
    },
  })
  const name = customer.value?.name ?? 'A cliente'
  toast.success(
    `Recebimento de ${formatBRL(result.amountCents)} registrado. ` +
      (result.openBalanceCents > 0
        ? `${name} ainda deve ${formatBRL(result.openBalanceCents)}.`
        : `${name} quitou o fiado.`),
  )
  lastReceiptId.value = result.id
  key = newIdempotencyKey()
  amount.value = null
  manual.value = null
  preview.reset()
  emit('done')
}

const methods = [
  { value: 'pix', label: 'Pix', icon: QrCode },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'card', label: 'Cartão', icon: CreditCard },
] as const
</script>

<template>
  <Card class="gap-5 p-5 shadow-sm">
    <div class="flex items-center justify-between rounded-lg bg-muted/60 p-4">
      <div>
        <p class="font-semibold">{{ customer?.name ?? '…' }}</p>
        <p class="text-sm text-muted-foreground">{{ customer?.phone }}</p>
      </div>
      <div class="text-right">
        <p class="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Em aberto</p>
        <p class="text-xl font-semibold text-brand"><MoneyText :cents="customer?.openBalanceCents ?? 0" /></p>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label for="receive-amount">Valor recebido</Label>
        <button type="button" class="text-xs font-medium text-brand hover:underline" @click="payAll">
          Quitar tudo ({{ formatBRL(customer?.openBalanceCents ?? 0) }})
        </button>
      </div>
      <MoneyInput id="receive-amount" v-model="amount" class="h-12 text-lg" />
    </div>

    <div class="space-y-2">
      <Label>Forma de pagamento</Label>
      <ToggleGroup v-model="method" type="single" variant="outline" class="grid w-full grid-cols-3">
        <ToggleGroupItem
          v-for="m in methods"
          :key="m.value"
          :value="m.value"
          class="data-[state=on]:bg-brand data-[state=on]:text-brand-foreground"
        >
          <component :is="m.icon" /> {{ m.label }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div class="flex items-center justify-between gap-3">
      <Label for="receive-date">Data do recebimento</Label>
      <Input id="receive-date" v-model="date" type="date" :max="today" class="w-44" />
    </div>

    <div v-if="preview.data.value || preview.error.value" class="space-y-2">
      <p class="flex items-center justify-between text-sm font-medium">
        <span class="flex items-center gap-2"><WandSparkles class="size-4 text-brand" /> Distribuição</span>
        <button v-if="manual" type="button" class="text-xs text-brand hover:underline" @click="manual = null">
          Voltar à sugestão (mais antigas primeiro)
        </button>
        <span v-else class="text-xs text-muted-foreground">Mais antigas primeiro</span>
      </p>
      <div
        v-for="line in preview.data.value?.lines ?? []"
        :key="line.receivableId"
        class="space-y-1.5 rounded-lg border p-3 text-sm"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium">{{ line.description }}</span>
          <MoneyInput
            :model-value="allocatedOf(line.receivableId)"
            class="h-8 w-32"
            @update:model-value="editLine(line.receivableId, $event ?? null)"
          />
        </div>
        <p class="flex justify-between text-xs text-muted-foreground">
          <span>Saldo <MoneyText :cents="line.balanceBeforeCents" /></span>
          <span>Fica <MoneyText :cents="line.balanceAfterCents" /></span>
        </p>
        <div class="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full bg-brand transition-all"
            :style="{ width: `${Math.round((line.allocatedCents / line.balanceBeforeCents) * 100)}%` }"
          />
        </div>
      </div>
      <p v-if="preview.error.value" class="rounded-md bg-red-50 p-3 text-sm text-red-700">
        {{ preview.error.value.message }}
      </p>
      <div v-else-if="preview.data.value" class="flex items-start gap-3 rounded-lg bg-brand-soft p-3 text-sm">
        <ArrowLeftRight class="mt-0.5 size-4 shrink-0 text-brand" />
        <p>{{ preview.data.value.message }}</p>
      </div>
    </div>

    <Button
      class="h-11 bg-brand text-base text-brand-foreground hover:bg-brand/90"
      :disabled="!canSave || receive.isPending.value"
      @click="save"
    >
      <LoaderCircle v-if="receive.isPending.value" class="animate-spin" /><Check v-else /> Confirmar
      recebimento<template v-if="amount"> ({{ formatBRL(amount) }})</template>
    </Button>
    <Button v-if="lastReceiptId" variant="outline" as-child>
      <a :href="`/api/receipts/${lastReceiptId}/receipt.pdf`" target="_blank" rel="noopener"
        ><FileText /> Comprovante do último recebimento</a
      >
    </Button>
  </Card>
</template>

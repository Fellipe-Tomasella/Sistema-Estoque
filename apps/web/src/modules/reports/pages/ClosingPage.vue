<script setup lang="ts">
import type { MoneyMethod } from '@estoque/shared'
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CreditCard,
  LoaderCircle,
  QrCode,
  TriangleAlert,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import MoneyInput from '@/components/common/MoneyInput.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatBRL, formatDate, formatDateTime, formatLongDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import ReportsTabs from '../components/ReportsTabs.vue'
import { shiftDate, useClosing } from '../composables/useReports'

/**
 * Fechamento do dia (RN-FEC-01…06): o que entrou por forma (na venda e de fiado), o que foi devolvido,
 * dinheiro esperado x contado. Pode refazer; se algo mudou depois de fechado, mostra as diferenças.
 */
const route = useRoute()
const router = useRouter()
const { data: dashboard } = useDashboard()
const today = computed(() => dashboard.value?.today ?? '')
const date = computed(() => (route.params.data as string) || today.value)
const { data, isPending, error, save } = useClosing(date)

const counted = ref<number | null>(null)
const notes = ref('')
watch(
  data,
  (d) => {
    counted.value = d?.saved?.countedCashCents ?? null
    notes.value = d?.saved?.notes ?? ''
  },
  { immediate: true },
)
const difference = computed(() =>
  counted.value === null || !data.value ? null : counted.value - data.value.totals.expectedCashCents,
)

const go = (d: string) => router.push(`/fechamento/${d}`)
const methods: { key: MoneyMethod; icon: typeof Banknote }[] = [
  { key: 'pix', icon: QrCode },
  { key: 'card', icon: CreditCard },
  { key: 'cash', icon: Banknote },
]
const fieldLabel = (field: string) =>
  ({
    'sales.count': 'Vendas',
    'sales.totalCents': 'Total vendido',
    'sales.fiadoCents': 'Vendido no fiado',
    expectedCashCents: 'Dinheiro esperado',
    exchangeCreditCents: 'Crédito de troca',
  })[field] ?? field
const fieldValue = (field: string, v: number) => (field.endsWith('Cents') ? formatBRL(v) : String(v))

async function close() {
  if (counted.value === null) return toast.error('Informe quanto dinheiro tem na gaveta.')
  await save.mutateAsync({ countedCashCents: counted.value, notes: notes.value.trim() || null })
  toast.success(`Fechamento de ${formatDate(date.value)} salvo.`)
}
</script>

<template>
  <PageHeader title="Relatórios" description="Conferência do dia: vendas, recebimentos e dinheiro na gaveta." />
  <ReportsTabs />

  <div class="mb-4 flex items-center gap-2">
    <Button variant="outline" size="icon" aria-label="Dia anterior" @click="go(shiftDate(date, -1))"
      ><ChevronLeft
    /></Button>
    <Input
      :model-value="date"
      type="date"
      :max="today"
      class="w-44"
      aria-label="Dia"
      @update:model-value="go(String($event))"
    />
    <Button
      variant="outline"
      size="icon"
      aria-label="Próximo dia"
      :disabled="date >= today"
      @click="go(shiftDate(date, 1))"
    >
      <ChevronRight />
    </Button>
    <span v-if="date" class="hidden text-sm text-muted-foreground sm:inline">{{ formatLongDate(date) }}</span>
  </div>

  <Skeleton v-if="isPending" class="h-96" />
  <p v-else-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error.message }}</p>
  <template v-else-if="data">
    <div
      v-if="data.changedAfterClosing"
      class="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p class="flex items-center gap-2 font-semibold">
        <TriangleAlert class="size-4" /> Alterado depois do fechamento
      </p>
      <p v-for="d in data.differences" :key="d.field">
        {{ fieldLabel(d.field) }}: {{ fieldValue(d.field, d.before) }} → {{ fieldValue(d.field, d.after) }}
      </p>
      <p class="text-xs">Confira e salve de novo para registrar o novo fechamento.</p>
    </div>

    <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Vendas</p>
        <p class="text-2xl font-semibold tabular">{{ data.totals.sales.count }}</p>
        <p class="text-xs text-muted-foreground"><MoneyText :cents="data.totals.sales.totalCents" /> vendido</p>
      </Card>
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Recebido no dia</p>
        <p class="text-2xl font-semibold text-emerald-700">
          <MoneyText :cents="data.totals.received.cash + data.totals.received.pix + data.totals.received.card" />
        </p>
      </Card>
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Ficou no fiado</p>
        <p class="text-2xl font-semibold text-brand"><MoneyText :cents="data.totals.sales.fiadoCents" /></p>
      </Card>
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Canceladas</p>
        <p class="text-2xl font-semibold tabular">{{ data.cancellations.length }}</p>
        <p class="text-xs text-muted-foreground">não somam nas vendas</p>
      </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card class="gap-0 overflow-hidden p-0 shadow-sm">
        <h2 class="border-b px-4 py-3 font-semibold">Entradas por forma de pagamento</h2>
        <div class="divide-y">
          <div v-for="m in methods" :key="m.key" class="flex items-center gap-3 px-4 py-3 text-sm">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
              <component :is="m.icon" class="size-4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-medium">{{ data.labels[m.key] }}</p>
              <p class="text-xs text-muted-foreground">
                Vendas <MoneyText :cents="data.totals.receivedAtSale[m.key]" /> · fiado recebido
                <MoneyText :cents="data.totals.receivedFiado[m.key]" />
                <template v-if="data.totals.refunded[m.key]">
                  · devolvido <span class="text-red-700">− <MoneyText :cents="data.totals.refunded[m.key]" /></span>
                </template>
              </p>
            </div>
            <p class="font-semibold"><MoneyText :cents="data.totals.balance[m.key]" /></p>
          </div>
          <div
            v-if="data.totals.exchangeCreditCents"
            class="flex justify-between px-4 py-3 text-sm text-muted-foreground"
          >
            <span>Crédito de troca (não é dinheiro)</span>
            <MoneyText :cents="data.totals.exchangeCreditCents" />
          </div>
        </div>
        <div
          v-if="data.cancellations.length || data.voidedReceipts.length"
          class="space-y-1 border-t px-4 py-3 text-sm"
        >
          <p class="font-medium">Ocorrências do dia</p>
          <p v-for="c in data.cancellations" :key="c.sale_id" class="text-muted-foreground">
            Venda #{{ String(c.number).padStart(6, '0') }} cancelada (<MoneyText :cents="c.total_cents" />):
            {{ c.reason }}
          </p>
          <p v-for="v in data.voidedReceipts" :key="v.payment_id" class="text-muted-foreground">
            Recebimento de <MoneyText :cents="v.amount_cents" /> de {{ formatDate(v.original_date) }} estornado:
            {{ v.reason }}
          </p>
        </div>
      </Card>

      <Card class="gap-4 p-5 shadow-sm lg:self-start">
        <h2 class="font-semibold">Dinheiro na gaveta</h2>
        <p class="flex justify-between rounded-lg bg-muted/60 p-3 text-sm">
          <span>Esperado em dinheiro</span>
          <strong><MoneyText :cents="data.totals.expectedCashCents" /></strong>
        </p>
        <div class="space-y-2">
          <Label for="counted">Quanto tem na gaveta</Label>
          <MoneyInput id="counted" v-model="counted" class="h-11 text-lg" />
        </div>
        <p
          v-if="difference !== null"
          :class="
            cn(
              'flex items-center gap-2 rounded-lg p-3 text-sm font-medium',
              difference === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900',
            )
          "
        >
          <CircleCheck v-if="difference === 0" class="size-4" /><TriangleAlert v-else class="size-4" />
          {{
            difference === 0
              ? 'Caixa bateu.'
              : `${difference > 0 ? 'Sobrou' : 'Faltou'} ${formatBRL(Math.abs(difference))}.`
          }}
        </p>
        <div class="space-y-2">
          <Label for="closing-notes">Observações</Label>
          <Textarea id="closing-notes" v-model="notes" rows="3" />
        </div>
        <Button
          class="h-11 bg-brand text-brand-foreground hover:bg-brand/90"
          :disabled="save.isPending.value"
          @click="close"
        >
          <LoaderCircle v-if="save.isPending.value" class="animate-spin" />
          {{ data.saved ? 'Refazer fechamento' : 'Salvar fechamento' }}
        </Button>
        <p v-if="data.saved" class="text-center text-xs text-muted-foreground">
          Fechado em {{ formatDateTime(data.saved.closedAt) }}
        </p>
      </Card>
    </div>
  </template>
</template>

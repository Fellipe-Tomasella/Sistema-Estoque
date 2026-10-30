<script setup lang="ts">
import type { MoneyMethod } from '@estoque/shared'
import { Banknote, CalendarClock, CreditCard, NotebookPen, QrCode, Trash2, Wallet } from '@lucide/vue'
import MoneyInput from '@/components/common/MoneyInput.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { newIdempotencyKey } from '@/lib/api'
import { totalOf } from '../cart'
import type { DraftState, SaleView } from '../composables/useSaleDraft'

/**
 * Pagamentos (RN-PAG): uma ou várias formas; Pix e cartão só contam com “recebido/aprovado” marcado;
 * dinheiro calcula o troco; o que faltar pode ir para o fiado com data combinada opcional.
 */
const props = defineProps<{ state: DraftState; view: SaleView | null }>()
const emit = defineEmits<{ change: [mutator: (state: DraftState) => void] }>()

const methods = [
  { value: 'pix', label: 'Pix', icon: QrCode },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'card', label: 'Cartão', icon: CreditCard },
] as const
const names: Record<MoneyMethod, string> = { pix: 'Pix', cash: 'Dinheiro', card: 'Cartão' }

const paid = () => props.state.payments.reduce((sum, p) => sum + p.amountCents, 0)
const remaining = () => Math.max(0, totalOf(props.state) - paid())
const changeOf = (id: string) => {
  const payment = props.view?.payments.find((p) => p.id === id)
  return payment && 'changeCents' in payment ? payment.changeCents : null
}

function add(method: MoneyMethod) {
  const amountCents = remaining()
  if (!amountCents) return
  emit('change', (s) =>
    s.payments.push({
      id: newIdempotencyKey(),
      method,
      amountCents,
      confirmed: method === 'cash',
      cardType: method === 'card' ? 'credit' : null,
      installments: method === 'card' ? 1 : null,
      cashGivenCents: null,
    }),
  )
}
const edit = (index: number, patch: Partial<DraftState['payments'][number]>) =>
  emit('change', (s) => Object.assign(s.payments[index]!, patch))
</script>

<template>
  <div class="space-y-3">
    <p class="flex items-center gap-2 text-sm font-medium"><Wallet class="size-4" /> Pagamento</p>

    <div class="grid grid-cols-3 gap-2">
      <Button
        v-for="m in methods"
        :key="m.value"
        variant="outline"
        :disabled="!remaining()"
        :data-method="m.value"
        @click="add(m.value)"
      >
        <component :is="m.icon" /> {{ m.label }}
      </Button>
    </div>

    <div v-for="(p, index) in state.payments" :key="p.id" class="space-y-2 rounded-lg border p-3">
      <div class="flex items-center gap-2">
        <span class="flex-1 text-sm font-medium">{{ index + 1 }}º · {{ names[p.method] }}</span>
        <MoneyInput
          :model-value="p.amountCents"
          class="w-32"
          :aria-label="`Valor em ${names[p.method]}`"
          @update:model-value="(v) => v && edit(index, { amountCents: v })"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remover pagamento"
          @click="emit('change', (s) => s.payments.splice(index, 1))"
        >
          <Trash2 class="text-muted-foreground" />
        </Button>
      </div>

      <label v-if="p.method !== 'cash'" class="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox :model-value="p.confirmed" @update:model-value="edit(index, { confirmed: $event === true })" />
        <span :class="p.confirmed ? 'text-emerald-700' : 'text-amber-700'">
          {{ p.method === 'pix' ? 'Pix recebido e conferido' : 'Aprovado na maquininha' }}
        </span>
      </label>

      <div v-if="p.method === 'card'" class="flex items-center gap-2">
        <ToggleGroup
          :model-value="p.cardType ?? 'credit'"
          type="single"
          variant="outline"
          size="sm"
          @update:model-value="(v) => v && edit(index, { cardType: v as 'credit' | 'debit', installments: 1 })"
        >
          <ToggleGroupItem value="credit" class="px-3">Crédito</ToggleGroupItem>
          <ToggleGroupItem value="debit" class="px-3">Débito</ToggleGroupItem>
        </ToggleGroup>
        <template v-if="p.cardType === 'credit'">
          <Input
            :model-value="p.installments ?? 1"
            type="number"
            min="1"
            max="24"
            class="h-8 w-16"
            aria-label="Parcelas"
            @update:model-value="edit(index, { installments: Math.min(24, Math.max(1, Number($event) || 1)) })"
          />
          <span class="text-xs text-muted-foreground">x</span>
        </template>
      </div>

      <div v-if="p.method === 'cash'" class="flex items-center gap-2 text-sm">
        <Label class="text-xs text-muted-foreground">Cliente entregou</Label>
        <MoneyInput
          :model-value="p.cashGivenCents"
          class="h-8 w-32"
          aria-label="Valor entregue"
          @update:model-value="edit(index, { cashGivenCents: $event ?? null })"
        />
        <span v-if="changeOf(p.id)" class="ml-auto font-medium text-emerald-700">
          Troco <MoneyText :cents="changeOf(p.id)!" />
        </span>
      </div>
    </div>

    <div class="space-y-2 rounded-lg border border-dashed p-3">
      <div class="flex items-center justify-between">
        <Label for="fiado-on" class="flex items-center gap-2"><NotebookPen class="size-4" /> Deixar no fiado</Label>
        <Switch
          id="fiado-on"
          :model-value="state.fiado"
          @update:model-value="emit('change', (s) => (s.fiado = $event))"
        />
      </div>
      <template v-if="state.fiado">
        <p class="text-sm">
          Fica no fiado: <strong><MoneyText :cents="view?.fiado.cents ?? remaining()" /></strong>
        </p>
        <div class="flex items-center gap-2">
          <Label for="fiado-due" class="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock class="size-3.5" /> Data combinada (opcional)
          </Label>
          <Input
            id="fiado-due"
            type="date"
            :model-value="state.fiadoDueDate ?? ''"
            class="h-8 w-40"
            @update:model-value="emit('change', (s) => (s.fiadoDueDate = String($event) || null))"
          />
        </div>
      </template>
    </div>
  </div>
</template>

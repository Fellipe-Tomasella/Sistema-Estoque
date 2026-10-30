<script setup lang="ts">
import { Hash, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ALL } from '@/modules/products/filters'
import { METHOD, PAYMENT_STATUS, SALE_STATUS, SHIPPING_STATUS } from '../labels'

/** Filtros do histórico (RN-VEN-11): período, número, situação, pagamento, envio e forma. */
const period = defineModel<string>('period', { required: true })
const number = defineModel<string>('number', { required: true })
const status = defineModel<string>('status', { required: true })
const payment = defineModel<string>('payment', { required: true })
const shipping = defineModel<string>('shipping', { required: true })
const method = defineModel<string>('method', { required: true })

const periods = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: '7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: ALL, label: 'Tudo' },
]
const selects = [
  { model: status, label: 'Situação', options: Object.entries(SALE_STATUS).filter(([k]) => k !== 'draft') },
  { model: payment, label: 'Pagamento', options: Object.entries(PAYMENT_STATUS) },
  { model: shipping, label: 'Envio', options: Object.entries(SHIPPING_STATUS) },
  {
    model: method,
    label: 'Forma',
    options: Object.entries(METHOD)
      .filter(([k]) => k !== 'exchange_credit')
      .map(([k, label]) => [k, { label }] as const),
  },
]

function clear() {
  number.value = ''
  period.value = ALL
  status.value = payment.value = shipping.value = method.value = ALL
}
</script>

<template>
  <div class="mb-4 space-y-2 rounded-lg border bg-card p-3 shadow-sm">
    <div class="flex flex-col gap-2 sm:flex-row">
      <div class="relative sm:w-48">
        <Hash class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="number" inputmode="numeric" placeholder="Nº da venda" class="pl-9" />
      </div>
      <ToggleGroup
        :model-value="period"
        type="single"
        variant="outline"
        class="w-full sm:w-auto"
        @update:model-value="(v) => v && (period = String(v))"
      >
        <ToggleGroupItem v-for="p in periods" :key="p.value" :value="p.value" class="flex-1 px-3">
          {{ p.label }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
      <Select v-for="s in selects" :key="s.label" v-model="s.model.value">
        <SelectTrigger class="w-full lg:w-44"><SelectValue :placeholder="s.label" /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">{{ s.label }}: todas</SelectItem>
          <SelectItem v-for="[value, o] in s.options" :key="value" :value="value">{{ o.label }}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" class="col-span-2 sm:col-span-4 lg:col-span-1" @click="clear"><X /> Limpar</Button>
    </div>
  </div>
</template>

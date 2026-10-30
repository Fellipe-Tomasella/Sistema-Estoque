<script setup lang="ts">
import { HandCoins, Mail, MapPin, Pencil, Phone, Power, PowerOff, ShoppingBag } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { client, unwrap } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { keys } from '@/lib/query'
import CustomerFormDialog from '../components/CustomerFormDialog.vue'
import { initials, useCustomer, useCustomerMutations, useCustomerReceivables } from '../composables/useCustomers'

const route = useRoute()
const id = computed(() => route.params.id as string)
const { data: customer, isPending } = useCustomer(id)
const { data: fiado } = useCustomerReceivables(id)
const { data: sales } = useQuery({
  queryKey: computed(() => keys.sales({ customerId: id.value })),
  queryFn: () => unwrap(client.sales.get({ query: { customerId: id.value, pageSize: 20 } })),
})
const { setActive } = useCustomerMutations()
const editing = ref(false)
const confirmToggle = ref(false)

const address = computed(() => {
  const a = customer.value?.address
  if (!a) return null
  return [
    a.street && `${a.street}${a.number ? `, ${a.number}` : ''}`,
    a.complement,
    a.district,
    a.city && `${a.city}${a.uf ? `/${a.uf}` : ''}`,
    a.zip,
  ]
    .filter(Boolean)
    .join(' · ')
})

const STATUS = {
  open: { label: 'Em aberto', tone: 'warning' },
  settled: { label: 'Quitada', tone: 'success' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
} as const
const PAYMENT = {
  paid: { label: 'Paga', tone: 'success' },
  partially_paid: { label: 'Parcial', tone: 'warning' },
  unpaid: { label: 'Fiado', tone: 'warning' },
} as const
const METHOD: Record<string, string> = { cash: 'Dinheiro', pix: 'Pix', card: 'Cartão' }

async function toggle() {
  const active = !customer.value!.active
  await setActive.mutateAsync({ id: id.value, active })
  toast.success(active ? 'Cliente reativada.' : 'Cliente inativada.')
  confirmToggle.value = false
}
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/clientes" class="hover:text-foreground">Clientes</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">{{ customer?.name ?? 'Cliente' }}</span>
  </nav>

  <template v-if="isPending"><Skeleton class="h-10 w-64" /><Skeleton class="mt-6 h-64 rounded-lg" /></template>

  <template v-else-if="customer">
    <PageHeader :title="customer.name">
      <template #eyebrow>
        <div class="mb-1 flex gap-2">
          <StatusBadge v-if="!customer.active" tone="neutral">Inativa</StatusBadge>
          <StatusBadge v-if="customer.overdue" tone="critical">Fiado em atraso</StatusBadge>
        </div>
      </template>
      <template #actions>
        <Button v-if="customer.openBalanceCents > 0" class="bg-brand text-brand-foreground hover:bg-brand/90" as-child>
          <RouterLink :to="`/fiado/receber?cliente=${customer.id}`"><HandCoins /> Receber fiado</RouterLink>
        </Button>
        <Button variant="outline" @click="editing = true"><Pencil /> Editar</Button>
        <Button variant="outline" @click="confirmToggle = true">
          <component :is="customer.active ? PowerOff : Power" /> {{ customer.active ? 'Inativar' : 'Reativar' }}
        </Button>
      </template>
    </PageHeader>

    <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div class="space-y-4">
        <Card class="gap-3 p-5 text-sm shadow-sm">
          <div class="flex items-center gap-3">
            <span
              class="flex size-11 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground"
            >
              {{ initials(customer.name) }}
            </span>
            <div>
              <p class="font-semibold">{{ customer.name }}</p>
              <p v-if="customer.document" class="text-xs text-muted-foreground">
                {{ customer.documentType === 'cnpj' ? 'CNPJ' : 'CPF' }} {{ customer.document }}
              </p>
            </div>
          </div>
          <p v-if="customer.phone" class="flex items-center gap-2">
            <Phone class="size-4 text-muted-foreground" /> {{ customer.phone }}
          </p>
          <p v-if="customer.email" class="flex items-center gap-2">
            <Mail class="size-4 text-muted-foreground" /> {{ customer.email }}
          </p>
          <p v-if="address" class="flex items-start gap-2">
            <MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {{ address }}
          </p>
          <p v-if="customer.notes" class="border-t pt-3 text-muted-foreground">{{ customer.notes }}</p>
        </Card>
        <Card class="gap-1 p-5 shadow-sm">
          <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Fiado em aberto</p>
          <p :class="['text-3xl font-semibold', customer.overdue && 'text-red-700']">
            <MoneyText :cents="customer.openBalanceCents" />
          </p>
        </Card>
      </div>

      <div class="space-y-4">
        <Card class="gap-0 overflow-hidden p-0 shadow-sm">
          <p class="px-5 py-4 font-semibold">Dívidas</p>
          <EmptyState v-if="!fiado?.receivables.length" title="Nenhuma compra no fiado" />
          <div v-for="debt in fiado?.receivables" :key="debt.id" class="border-t px-5 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink v-if="debt.saleId" :to="`/vendas/${debt.saleId}`" class="font-medium hover:underline">{{
                debt.description
              }}</RouterLink>
              <span v-else class="font-medium">{{ debt.description }}</span>
              <StatusBadge :tone="STATUS[debt.status].tone">{{ STATUS[debt.status].label }}</StatusBadge>
              <StatusBadge v-if="debt.overdue" tone="critical">Em atraso</StatusBadge>
              <span class="ml-auto font-semibold"><MoneyText :cents="debt.balanceCents" /></span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ formatDate(debt.businessDate) }} · valor original <MoneyText :cents="debt.originalCents" />
              <template v-if="debt.dueDate"> · combinado para {{ formatDate(debt.dueDate) }}</template>
            </p>
            <ul v-if="debt.receipts.length || debt.adjustments.length" class="mt-2 space-y-1 text-xs">
              <li
                v-for="r in debt.receipts"
                :key="r.paymentId"
                :class="r.status === 'voided' && 'text-muted-foreground line-through'"
              >
                Recebido {{ formatDate(r.businessDate) }} · {{ METHOD[r.method] ?? r.method }} ·
                <MoneyText :cents="r.amountCents" />
              </li>
              <li v-for="a in debt.adjustments" :key="a.id" class="text-muted-foreground">
                {{ a.reason === 'sale_cancelled' ? 'Cancelado' : 'Peças devolvidas' }} ·
                <MoneyText :cents="a.amountCents" />
              </li>
            </ul>
          </div>
        </Card>

        <Card class="gap-0 overflow-hidden p-0 shadow-sm">
          <p class="px-5 py-4 font-semibold">Compras</p>
          <EmptyState v-if="!sales?.items.length" :icon="ShoppingBag" title="Nenhuma compra ainda" />
          <RouterLink
            v-for="sale in sales?.items"
            :key="sale.id"
            :to="`/vendas/${sale.id}`"
            class="flex items-center gap-3 border-t px-5 py-3 text-sm hover:bg-muted/50"
          >
            <span class="font-medium">{{ sale.numberLabel }}</span>
            <span class="text-muted-foreground">{{ formatDate(sale.businessDate) }}</span>
            <StatusBadge v-if="sale.status === 'cancelled'" tone="critical">Cancelada</StatusBadge>
            <StatusBadge v-else-if="sale.paymentStatus" :tone="PAYMENT[sale.paymentStatus].tone">
              {{ PAYMENT[sale.paymentStatus].label }}
            </StatusBadge>
            <span class="ml-auto font-semibold"><MoneyText :cents="sale.totalCents" /></span>
          </RouterLink>
        </Card>
      </div>
    </div>

    <CustomerFormDialog v-model:open="editing" :customer="customer" />
    <ConfirmDialog
      v-model:open="confirmToggle"
      :title="customer.active ? 'Inativar cliente?' : 'Reativar cliente?'"
      :description="
        customer.active
          ? 'Ela some da lista padrão e do PDV, mas compras e dívidas continuam no histórico.'
          : 'Ela volta para a lista e para o PDV.'
      "
      :confirm-label="customer.active ? 'Inativar' : 'Reativar'"
      :loading="setActive.isPending.value"
      @confirm="toggle"
    />
  </template>
</template>

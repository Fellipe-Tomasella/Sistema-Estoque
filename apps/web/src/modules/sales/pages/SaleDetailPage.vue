<script setup lang="ts">
import { ArrowLeftRight, Calendar, CircleX, FileText, StickyNote, UserRound } from '@lucide/vue'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/format'
import { initials, useCustomer } from '@/modules/customers/composables/useCustomers'
import CancelSaleDialog from '@/modules/returns/components/CancelSaleDialog.vue'
import FiscalCard from '../components/FiscalCard.vue'
import SaleItemsCard from '../components/SaleItemsCard.vue'
import SalePaymentsCard from '../components/SalePaymentsCard.vue'
import SaleTimeline from '../components/SaleTimeline.vue'
import ShippingCard from '../components/ShippingCard.vue'
import { useSale, useSaleMutations } from '../composables/useSales'
import { PAYMENT_STATUS, SALE_STATUS } from '../labels'

/** Detalhe da venda (06 §Vendas): itens, pagamentos, cliente, envio, fiscal e linha do tempo. */
const route = useRoute()
const router = useRouter()
const id = () => route.params.id as string
const { data: sale, isPending, error } = useSale(id)
const { data: customer } = useCustomer(() => sale.value?.customerId ?? '')
const { notes } = useSaleMutations(id)

// Rascunho não tem detalhe: abre no PDV.
watch(sale, (s) => s?.status === 'draft' && router.replace(`/vender/${s.id}`))

const cancelling = ref(false)
const noteText = ref('')
watch(sale, (s) => (noteText.value = s?.notes ?? ''), { immediate: true })
async function saveNotes() {
  await notes.mutateAsync(noteText.value.trim() || null)
  toast.success('Observação salva.')
}
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/vendas" class="hover:text-foreground">Vendas</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">{{ sale?.numberLabel ?? 'Venda' }}</span>
  </nav>

  <template v-if="isPending"><Skeleton class="h-24" /><Skeleton class="mt-4 h-96" /></template>
  <EmptyState v-else-if="error || !sale" title="Venda não encontrada" description="Confira o link ou volte à lista." />

  <template v-else>
    <Card class="mb-4 gap-3 p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">Venda {{ sale.numberLabel }}</h1>
        <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar class="size-4" /> {{ formatDateTime(sale.confirmedAt) }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <StatusBadge :tone="SALE_STATUS[sale.status].tone">{{ SALE_STATUS[sale.status].label }}</StatusBadge>
          <StatusBadge
            v-if="sale.paymentStatus && sale.status === 'confirmed'"
            :tone="PAYMENT_STATUS[sale.paymentStatus].tone"
          >
            {{ PAYMENT_STATUS[sale.paymentStatus].label }}
          </StatusBadge>
        </div>
        <p v-if="sale.cancellation" class="text-sm text-red-700">
          Cancelada em {{ formatDateTime(sale.cancellation.at) }}: {{ sale.cancellation.reason }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" as-child>
          <a :href="`/api/sales/${sale.id}/receipt.pdf`" target="_blank" rel="noopener"><FileText /> Comprovante</a>
        </Button>
        <template v-if="sale.status === 'confirmed'">
          <Button variant="outline" as-child>
            <RouterLink :to="`/vendas/${sale.id}/devolver`"><ArrowLeftRight /> Devolver / trocar</RouterLink>
          </Button>
          <Button variant="outline" class="text-red-700 hover:bg-red-50 hover:text-red-700" @click="cancelling = true">
            <CircleX /> Cancelar venda
          </Button>
          <CancelSaleDialog v-model:open="cancelling" :sale-id="sale.id" :number-label="sale.numberLabel ?? ''" />
        </template>
      </div>
    </Card>

    <div class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div class="space-y-4">
        <SaleItemsCard :sale="sale" />
        <SalePaymentsCard :sale="sale" />
        <SaleTimeline :events="sale.timeline" />
      </div>

      <div class="space-y-4">
        <Card class="gap-3 p-5 shadow-sm">
          <h2 class="flex items-center gap-2 font-semibold"><UserRound class="size-4 text-brand" /> Cliente</h2>
          <template v-if="sale.customer">
            <div class="flex items-center gap-3">
              <span
                class="flex size-11 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
              >
                {{ initials(sale.customer.name) }}
              </span>
              <div>
                <p class="font-medium">{{ sale.customer.name }}</p>
                <p class="text-xs text-muted-foreground">{{ sale.customer.phone ?? 'sem telefone' }}</p>
              </div>
            </div>
            <p v-if="customer && customer.openBalanceCents > 0" class="rounded-md bg-red-50 p-3 text-sm text-red-800">
              Deve no total <strong><MoneyText :cents="customer.openBalanceCents" /></strong>
            </p>
            <Button v-if="sale.customerId" variant="secondary" as-child>
              <RouterLink :to="`/clientes/${sale.customerId}`">Ver ficha da cliente</RouterLink>
            </Button>
          </template>
          <p v-else class="text-sm text-muted-foreground">Venda sem cliente.</p>
        </Card>

        <ShippingCard :sale="sale" />
        <FiscalCard :sale="sale" />

        <Card class="gap-3 p-5 shadow-sm">
          <h2 class="flex items-center gap-2 font-semibold"><StickyNote class="size-4 text-brand" /> Observações</h2>
          <Textarea v-model="noteText" rows="3" placeholder="Anotações sobre esta venda" />
          <Button
            v-if="noteText !== (sale.notes ?? '')"
            variant="outline"
            :disabled="notes.isPending.value"
            @click="saveNotes"
          >
            Salvar observação
          </Button>
        </Card>
      </div>
    </div>
  </template>
</template>

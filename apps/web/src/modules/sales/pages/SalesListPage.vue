<script setup lang="ts">
import type { MoneyMethod, SalePaymentStatus, SaleStatus, ShippingStatus } from '@estoque/shared'
import { ChevronLeft, ChevronRight, Plus, Receipt } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import { ALL } from '@/modules/products/filters'
import SaleFilters from '../components/SaleFilters.vue'
import { useSaleList } from '../composables/useSales'
import { PAYMENT_STATUS, SALE_STATUS, SHIPPING_STATUS } from '../labels'

/** Histórico de vendas (06 §Vendas). Filtros ficam na URL: a busca global abre `?numero=` e o Início `?envio=`. */
const PAGE_SIZE = 30
const router = useRouter()
const page = useRouteQuery('pagina', '1', { transform: Number })
const number = useRouteQuery<string>('numero', '')
const period = useRouteQuery<string>('periodo', ALL)
const status = useRouteQuery<string>('situacao', ALL)
const payment = useRouteQuery<string>('pagamento', ALL)
const shipping = useRouteQuery<string>('envio', ALL)
const method = useRouteQuery<string>('forma', ALL)
const debouncedNumber = refDebounced(number, 300)
watch([number, period, status, payment, shipping, method], () => (page.value = 1))

const { data: dashboard } = useDashboard()

/** Datas do período a partir de “hoje” da loja (fuso das configurações). */
const range = computed(() => {
  const today = dashboard.value?.today
  if (!today || period.value === ALL) return {}
  const shift = (days: number) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }
  if (period.value === 'hoje') return { from: today, to: today }
  if (period.value === 'semana') return { from: shift(-6), to: today }
  return { from: `${today.slice(0, 8)}01`, to: today }
})

const pick = <T extends string>(value: string) => (value === ALL ? undefined : (value as T))
const filters = computed(() => ({
  ...range.value,
  number: Number(debouncedNumber.value) || undefined,
  status: pick<SaleStatus>(status.value),
  paymentStatus: pick<SalePaymentStatus>(payment.value),
  shippingStatus: pick<ShippingStatus>(shipping.value),
  method: pick<MoneyMethod>(method.value),
  page: page.value,
  pageSize: PAGE_SIZE,
}))
const { data, isPending } = useSaleList(filters)
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / PAGE_SIZE)))
const open = (id: string) => router.push(`/vendas/${id}`)
</script>

<template>
  <PageHeader title="Vendas" description="Todas as vendas confirmadas e canceladas, com pagamento e envio.">
    <template #actions>
      <Button class="bg-brand text-brand-foreground hover:bg-brand/90" as-child>
        <RouterLink to="/vender"><Plus /> Nova venda</RouterLink>
      </Button>
    </template>
  </PageHeader>

  <SaleFilters
    v-model:number="number"
    v-model:period="period"
    v-model:status="status"
    v-model:payment="payment"
    v-model:shipping="shipping"
    v-model:method="method"
  />

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 5" :key="i" class="h-12" /></div>
    <EmptyState
      v-else-if="!data?.items.length"
      :icon="Receipt"
      title="Nenhuma venda encontrada"
      description="Mude os filtros ou registre uma venda."
    />
    <template v-else>
      <!-- Notebook: tabela -->
      <Table class="hidden md:table">
        <TableHeader>
          <TableRow class="bg-muted/50">
            <TableHead>Venda</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead class="text-right">Total</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Envio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="s in data.items"
            :key="s.id"
            :class="cn('cursor-pointer', s.status === 'cancelled' && 'bg-red-50/40 text-muted-foreground')"
            tabindex="0"
            @click="open(s.id)"
            @keydown.enter="open(s.id)"
          >
            <TableCell>
              <p :class="cn('font-semibold text-brand', s.status === 'cancelled' && 'line-through')">
                {{ s.numberLabel }}
              </p>
              <p class="text-xs text-muted-foreground">{{ formatDateTime(s.confirmedAt) }}</p>
            </TableCell>
            <TableCell>{{ s.customerName ?? 'Sem cliente' }}</TableCell>
            <TableCell class="text-right font-semibold"><MoneyText :cents="s.totalCents" /></TableCell>
            <TableCell>
              <StatusBadge :tone="SALE_STATUS[s.status].tone">{{ SALE_STATUS[s.status].label }}</StatusBadge>
            </TableCell>
            <TableCell>
              <StatusBadge
                v-if="s.paymentStatus && s.status !== 'cancelled'"
                :tone="PAYMENT_STATUS[s.paymentStatus].tone"
              >
                {{ PAYMENT_STATUS[s.paymentStatus].label }}
              </StatusBadge>
            </TableCell>
            <TableCell>
              <StatusBadge v-if="s.shippingStatus !== 'none'" :tone="SHIPPING_STATUS[s.shippingStatus].tone">
                {{ SHIPPING_STATUS[s.shippingStatus].label }}
              </StatusBadge>
              <span v-else class="text-xs text-muted-foreground">—</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Celular: cartões -->
      <RouterLink
        v-for="s in data.items"
        :key="s.id"
        :to="`/vendas/${s.id}`"
        class="flex items-center gap-3 border-b px-4 py-3 last:border-0 md:hidden"
      >
        <div class="min-w-0 flex-1">
          <p :class="cn('font-semibold text-brand', s.status === 'cancelled' && 'line-through')">
            {{ s.numberLabel }} <span class="font-normal text-foreground">· {{ s.customerName ?? 'Sem cliente' }}</span>
          </p>
          <p class="text-xs text-muted-foreground">{{ formatDateTime(s.confirmedAt) }}</p>
          <div class="mt-1 flex flex-wrap gap-1">
            <StatusBadge v-if="s.status === 'cancelled'" tone="critical">Cancelada</StatusBadge>
            <StatusBadge v-else-if="s.paymentStatus" :tone="PAYMENT_STATUS[s.paymentStatus].tone">
              {{ PAYMENT_STATUS[s.paymentStatus].label }}
            </StatusBadge>
            <StatusBadge v-if="s.shippingStatus !== 'none'" :tone="SHIPPING_STATUS[s.shippingStatus].tone">
              {{ SHIPPING_STATUS[s.shippingStatus].label }}
            </StatusBadge>
          </div>
        </div>
        <p class="font-semibold"><MoneyText :cents="s.totalCents" /></p>
      </RouterLink>
    </template>
  </Card>

  <div class="mt-4 flex items-center justify-between gap-2 text-sm">
    <span class="text-muted-foreground">{{ data?.total ?? 0 }} {{ data?.total === 1 ? 'venda' : 'vendas' }}</span>
    <div v-if="pages > 1" class="flex items-center gap-2">
      <span class="text-muted-foreground">Página {{ page }} de {{ pages }}</span>
      <Button variant="outline" size="icon-sm" :disabled="page <= 1" aria-label="Página anterior" @click="page--">
        <ChevronLeft />
      </Button>
      <Button variant="outline" size="icon-sm" :disabled="page >= pages" aria-label="Próxima página" @click="page++">
        <ChevronRight />
      </Button>
    </div>
  </div>
</template>

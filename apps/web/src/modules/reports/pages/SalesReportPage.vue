<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { computed } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate } from '@/lib/format'
import PeriodPicker from '../components/PeriodPicker.vue'
import ReportsTabs from '../components/ReportsTabs.vue'
import { csvUrl, usePeriod, useSalesReport } from '../composables/useReports'

/** Vendas por período (RN-REL-01/02): totais, agrupado por dia/semana/mês, canceladas e devoluções à parte. */
const { from, to, today, presets, ready } = usePeriod()
const groupBy = useRouteQuery<'day' | 'week' | 'month'>('agrupar', 'day')
const query = computed(() => ({ from: from.value, to: to.value, groupBy: groupBy.value }))
const { data, isPending } = useSalesReport(query, ready)
const max = computed(() => Math.max(1, ...(data.value?.groups.map((g) => g.totalCents) ?? [])))
const RETURN_TYPE: Record<string, string> = {
  cancellation: 'Cancelamento',
  partial_return: 'Devolução',
  exchange: 'Troca',
}
const periodLabel = (p: string) =>
  groupBy.value === 'month' ? p.slice(0, 7).split('-').reverse().join('/') : formatDate(p)
</script>

<template>
  <PageHeader title="Relatórios" description="Números do período pela data da venda (fuso da loja)." />
  <ReportsTabs />
  <PeriodPicker
    v-model:from="from"
    v-model:to="to"
    :presets="presets"
    :max="today"
    :csv="csvUrl('sales', { from, to, groupBy })"
  />

  <Skeleton v-if="isPending" class="h-64" />
  <template v-else-if="data">
    <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Vendas</p>
        <p class="text-2xl font-semibold tabular">{{ data.totals.count }}</p>
      </Card>
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Peças (subtotal)</p>
        <p class="text-2xl font-semibold"><MoneyText :cents="data.totals.subtotalCents" /></p>
      </Card>
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Descontos</p>
        <p class="text-2xl font-semibold text-emerald-700"><MoneyText :cents="data.totals.discountCents" /></p>
      </Card>
      <Card class="gap-1 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground uppercase">Total vendido</p>
        <p class="text-2xl font-semibold text-brand"><MoneyText :cents="data.totals.totalCents" /></p>
      </Card>
    </div>

    <Card class="mb-4 gap-0 overflow-hidden p-0 shadow-sm">
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h2 class="font-semibold">Por período</h2>
        <ToggleGroup v-model="groupBy" type="single" variant="outline" size="sm">
          <ToggleGroupItem value="day" class="px-3">Dia</ToggleGroupItem>
          <ToggleGroupItem value="week" class="px-3">Semana</ToggleGroupItem>
          <ToggleGroupItem value="month" class="px-3">Mês</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <EmptyState v-if="!data.groups.length" title="Nenhuma venda no período" />
      <Table v-else>
        <TableHeader>
          <TableRow class="bg-muted/50">
            <TableHead>{{ groupBy === 'day' ? 'Dia' : groupBy === 'week' ? 'Semana de' : 'Mês' }}</TableHead>
            <TableHead class="text-right">Vendas</TableHead>
            <TableHead class="hidden text-right sm:table-cell">Descontos</TableHead>
            <TableHead class="text-right">Total</TableHead>
            <TableHead class="hidden w-1/3 md:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="g in data.groups" :key="g.period">
            <TableCell class="font-medium">{{ periodLabel(g.period) }}</TableCell>
            <TableCell class="text-right tabular">{{ g.count }}</TableCell>
            <TableCell class="hidden text-right sm:table-cell"><MoneyText :cents="g.discountCents" /></TableCell>
            <TableCell class="text-right font-semibold"><MoneyText :cents="g.totalCents" /></TableCell>
            <TableCell class="hidden md:table-cell">
              <div class="h-2 rounded-full bg-muted">
                <div class="h-full rounded-full bg-brand" :style="{ width: `${(g.totalCents / max) * 100}%` }" />
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card class="gap-2 p-4 shadow-sm">
        <h2 class="font-semibold">Canceladas no período</h2>
        <p v-if="!data.cancelled.length" class="text-sm text-muted-foreground">Nenhuma.</p>
        <RouterLink
          v-for="c in data.cancelled"
          :key="c.id"
          :to="`/vendas/${c.id}`"
          class="flex justify-between gap-2 rounded-md p-2 text-sm hover:bg-muted"
        >
          <span>{{ c.numberLabel }} · {{ formatDate(c.businessDate) }} · {{ c.reason }}</span>
          <MoneyText :cents="c.totalCents" class="text-muted-foreground line-through" />
        </RouterLink>
      </Card>
      <Card class="gap-2 p-4 shadow-sm">
        <h2 class="flex justify-between font-semibold">
          Devoluções e trocas <MoneyText :cents="data.returns.totalCents" class="text-sm font-normal" />
        </h2>
        <p v-if="!data.returns.items.length" class="text-sm text-muted-foreground">Nenhuma.</p>
        <p v-for="r in data.returns.items" :key="r.id" class="flex justify-between gap-2 text-sm">
          <span>{{ RETURN_TYPE[r.type] }} · venda {{ r.saleNumberLabel }} · {{ formatDate(r.businessDate) }}</span>
          <MoneyText :cents="r.valueCents" />
        </p>
      </Card>
    </div>
  </template>
</template>

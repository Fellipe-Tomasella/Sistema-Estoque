<script setup lang="ts">
import { Download } from '@lucide/vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { useOpenReceivables } from '@/modules/receivables/composables/useReceivables'
import ReportsTabs from '../components/ReportsTabs.vue'

/** Fiado em aberto (RN-REL-03): quem deve, quanto, desde quando e se está em atraso; exporta CSV. */
const { data, isPending } = useOpenReceivables()
</script>

<template>
  <PageHeader title="Relatórios" description="Saldo de fiado de hoje, por cliente." />
  <ReportsTabs />

  <div class="mb-4 flex items-center justify-between gap-2">
    <p class="text-sm">
      Total em aberto: <strong class="text-lg"><MoneyText :cents="data?.totalOpenCents ?? 0" /></strong>
    </p>
    <Button variant="outline" as-child>
      <a href="/api/reports/receivables.csv"><Download /> Exportar CSV</a>
    </Button>
  </div>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <Skeleton v-if="isPending" class="m-4 h-40" />
    <EmptyState v-else-if="!data?.customers.length" title="Ninguém devendo" />
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead>Cliente</TableHead>
          <TableHead class="hidden sm:table-cell">Desde</TableHead>
          <TableHead class="hidden text-right sm:table-cell">Compras</TableHead>
          <TableHead class="text-right">Em aberto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="c in data.customers" :key="c.customerId">
          <TableCell>
            <RouterLink :to="`/clientes/${c.customerId}`" class="font-medium hover:underline">{{ c.name }}</RouterLink>
            <p class="text-xs text-muted-foreground">{{ c.phone }}</p>
          </TableCell>
          <TableCell class="hidden sm:table-cell">{{ formatDate(c.oldestDate) }}</TableCell>
          <TableCell class="hidden text-right tabular sm:table-cell">{{ c.debts }}</TableCell>
          <TableCell class="text-right">
            <p class="font-semibold"><MoneyText :cents="c.openBalanceCents" /></p>
            <StatusBadge v-if="c.overdue" tone="critical">Em atraso</StatusBadge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>
</template>

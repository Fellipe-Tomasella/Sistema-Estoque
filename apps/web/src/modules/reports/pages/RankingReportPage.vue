<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import { computed } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import PeriodPicker from '../components/PeriodPicker.vue'
import ReportsTabs from '../components/ReportsTabs.vue'
import { csvUrl, usePeriod, useRankingReport } from '../composables/useReports'

/** Mais e menos vendidos (RN-REL-04): pelo líquido (vendido − devolvido), por produto ou variação. */
const { from, to, today, presets, ready } = usePeriod()
const level = useRouteQuery<'product' | 'variant'>('nivel', 'product')
const order = useRouteQuery<'desc' | 'asc'>('ordem', 'desc')
const query = computed(() => ({ from: from.value, to: to.value, level: level.value, order: order.value }))
const { data, isPending } = useRankingReport(query, ready)
</script>

<template>
  <PageHeader title="Relatórios" description="Peças vendidas no período, descontadas as devoluções." />
  <ReportsTabs />
  <PeriodPicker
    v-model:from="from"
    v-model:to="to"
    :presets="presets"
    :max="today"
    :csv="csvUrl('products-ranking', { from, to, level, order })"
  />

  <div class="mb-3 flex flex-wrap gap-2">
    <ToggleGroup v-model="order" type="single" variant="outline" size="sm">
      <ToggleGroupItem value="desc" class="px-3">Mais vendidos</ToggleGroupItem>
      <ToggleGroupItem value="asc" class="px-3">Menos vendidos</ToggleGroupItem>
    </ToggleGroup>
    <ToggleGroup v-model="level" type="single" variant="outline" size="sm">
      <ToggleGroupItem value="product" class="px-3">Por produto</ToggleGroupItem>
      <ToggleGroupItem value="variant" class="px-3">Por cor/tamanho</ToggleGroupItem>
    </ToggleGroup>
  </div>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <Skeleton v-if="isPending" class="m-4 h-40" />
    <EmptyState v-else-if="!data?.items.length" title="Nenhum produto" />
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead class="w-10">#</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead class="text-right">Vendidas</TableHead>
          <TableHead class="text-right">Devolvidas</TableHead>
          <TableHead class="text-right">Líquido</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(r, i) in data.items" :key="`${r.productId}-${r.variantId}`">
          <TableCell class="text-muted-foreground tabular">{{ i + 1 }}</TableCell>
          <TableCell>
            <RouterLink :to="`/produtos/${r.productId}`" class="font-medium hover:underline">{{
              r.productName
            }}</RouterLink>
            <p v-if="r.variantLabel" class="text-xs text-muted-foreground">{{ r.variantLabel }}</p>
          </TableCell>
          <TableCell class="text-right tabular">{{ r.soldQty }}</TableCell>
          <TableCell class="text-right text-muted-foreground tabular">{{ r.returnedQty }}</TableCell>
          <TableCell class="text-right font-semibold tabular">{{ r.netQty }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>
</template>

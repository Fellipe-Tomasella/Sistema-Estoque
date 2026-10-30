<script setup lang="ts">
import { ArrowDownToLine, ChevronLeft, ChevronRight } from '@lucide/vue'
import { useRouteQuery } from '@vueuse/router'
import { computed } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/lib/format'
import StockTabs from '../components/StockTabs.vue'
import { useEntries, useEntry } from '../composables/useStock'

const PAGE_SIZE = 30
const page = useRouteQuery('pagina', '1', { transform: Number })
// Detalhe aberto pela URL (?entrada=id): o link volta direto para a entrada.
const selected = useRouteQuery<string | null>('entrada', null)

const { data, isPending } = useEntries(() => ({ page: page.value, pageSize: PAGE_SIZE }))
const { data: entry } = useEntry(selected)
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / PAGE_SIZE)))
</script>

<template>
  <PageHeader
    title="Entradas de estoque"
    description="Mercadorias recebidas. Entrada lançada não é editada: erro se corrige com acerto."
  >
    <template #actions>
      <Button class="bg-brand text-brand-foreground hover:bg-brand/90" as-child>
        <RouterLink to="/estoque/entradas/nova"><ArrowDownToLine /> Nova entrada</RouterLink>
      </Button>
    </template>
  </PageHeader>
  <StockTabs />

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 4" :key="i" class="h-10" /></div>
    <EmptyState
      v-else-if="!data?.items.length"
      title="Nenhuma entrada registrada"
      description="As mercadorias recebidas aparecem aqui."
    />
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead>Data</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead class="hidden sm:table-cell">Nota / pedido</TableHead>
          <TableHead class="text-right">Itens</TableHead>
          <TableHead class="text-right">Peças</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in data.items"
          :key="row.id"
          class="cursor-pointer"
          tabindex="0"
          @click="selected = row.id"
          @keydown.enter="selected = row.id"
        >
          <TableCell class="font-medium">{{ formatDate(row.entryDate) }}</TableCell>
          <TableCell>{{ row.supplierName ?? '—' }}</TableCell>
          <TableCell class="hidden text-muted-foreground sm:table-cell">{{ row.reference ?? '—' }}</TableCell>
          <TableCell class="text-right tabular">{{ row.itemCount }}</TableCell>
          <TableCell class="text-right font-semibold tabular">+{{ row.units }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>

  <div v-if="pages > 1" class="mt-4 flex items-center justify-end gap-2 text-sm">
    <span class="text-muted-foreground">Página {{ page }} de {{ pages }}</span>
    <Button variant="outline" size="icon-sm" :disabled="page <= 1" aria-label="Página anterior" @click="page--"
      ><ChevronLeft
    /></Button>
    <Button variant="outline" size="icon-sm" :disabled="page >= pages" aria-label="Próxima página" @click="page++"
      ><ChevronRight
    /></Button>
  </div>

  <Sheet :open="Boolean(selected)" @update:open="!$event && (selected = null)">
    <SheetContent class="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Entrada de {{ entry ? formatDate(entry.entryDate) : '…' }}</SheetTitle>
        <SheetDescription v-if="entry">
          {{ entry.supplierName ?? 'Sem fornecedor'
          }}<template v-if="entry.reference"> · {{ entry.reference }}</template> · lançada
          {{ formatDateTime(entry.createdAt) }}
        </SheetDescription>
      </SheetHeader>
      <div v-if="entry" class="space-y-3 px-4 pb-4">
        <div
          v-for="item in entry.items"
          :key="item.id"
          class="flex items-center justify-between rounded-lg border p-3 text-sm"
        >
          <div>
            <p class="font-medium">{{ item.productName }}</p>
            <p class="text-xs text-muted-foreground">
              {{ item.color }} / {{ item.size }}
              <template v-if="item.unitCostCents !== null"> · custo <MoneyText :cents="item.unitCostCents" /></template>
            </p>
          </div>
          <span class="font-semibold tabular">+{{ item.quantity }}</span>
        </div>
        <p v-if="entry.notes" class="text-sm text-muted-foreground">{{ entry.notes }}</p>
      </div>
    </SheetContent>
  </Sheet>
</template>

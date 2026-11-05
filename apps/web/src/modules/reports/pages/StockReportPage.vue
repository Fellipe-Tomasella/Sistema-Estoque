<script setup lang="ts">
import { Download, Search } from '@lucide/vue'
import { refDebounced, useMediaQuery } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, pieces } from '@/lib/format'
import ReportsTabs from '../components/ReportsTabs.vue'
import { csvUrl, useStockReport } from '../composables/useReports'

/**
 * Relatório de estoque (RN-REL-07): quanto há de peças e quanto vale (a custo e a preço de venda), por categoria
 * e por peça, com a última entrada e a última venda para enxergar o que está parado. Exporta CSV.
 */
const status = ref<'all' | 'in' | 'out' | 'low'>('in')
const category = ref('all')
const search = ref('')
const q = refDebounced(search, 250)
const query = computed(() => ({
  status: status.value,
  category: category.value === 'all' ? undefined : category.value,
  q: q.value.trim() || undefined,
}))
const { data, isPending } = useStockReport(query)
const isMobile = useMediaQuery('(max-width: 767px)')

// categorias para o filtro: guardadas da primeira consulta sem filtro de categoria
const categories = ref<string[]>([])
watch(data, (d) => {
  if (!d || category.value !== 'all') return
  const names = d.byCategory.map((c) => c.category).filter((c) => c !== 'Sem categoria')
  categories.value = [...new Set([...categories.value, ...names])].sort()
})

const statusLabels = { all: 'Todas as peças', in: 'Com estoque', out: 'Sem estoque', low: 'A repor' }
const badge = (s: string) =>
  s === 'out'
    ? { tone: 'critical' as const, text: 'Sem estoque' }
    : s === 'low'
      ? { tone: 'warning' as const, text: 'Baixo' }
      : null
const csvLink = computed(() => csvUrl('stock', query.value))
</script>

<template>
  <PageHeader title="Relatórios" description="Quanto há no estoque e quanto ele vale." />
  <ReportsTabs />

  <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Card class="gap-1 p-4 shadow-sm">
      <p class="text-xs text-muted-foreground">Peças</p>
      <p class="text-2xl font-semibold tabular">{{ data?.totals.pieces ?? 0 }}</p>
      <p class="text-xs text-muted-foreground">
        {{ data?.totals.products ?? 0 }} produtos · {{ data?.totals.variants ?? 0 }} variações
      </p>
    </Card>
    <Card class="gap-1 p-4 shadow-sm">
      <p class="text-xs text-muted-foreground">Valor a custo</p>
      <p class="text-2xl font-semibold"><MoneyText :cents="data?.totals.costCents ?? 0" /></p>
      <p v-if="data?.totals.piecesWithoutCost" class="text-xs text-amber-700">
        {{ pieces(data.totals.piecesWithoutCost) }} sem custo cadastrado
      </p>
    </Card>
    <Card class="gap-1 p-4 shadow-sm">
      <p class="text-xs text-muted-foreground">Valor a preço de venda</p>
      <p class="text-2xl font-semibold"><MoneyText :cents="data?.totals.valueCents ?? 0" /></p>
    </Card>
    <Card class="gap-1 p-4 shadow-sm">
      <p class="text-xs text-muted-foreground">Diferença (venda − custo)</p>
      <p class="text-2xl font-semibold">
        <MoneyText :cents="data?.totals.marginCents ?? 0" />
      </p>
      <p class="text-xs text-muted-foreground">só das peças com custo</p>
    </Card>
  </div>

  <div class="mb-4 flex flex-wrap items-center gap-2">
    <div class="relative w-full sm:w-64">
      <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="search" placeholder="Buscar peça, cor, código" class="pl-9" />
    </div>
    <Select v-model="status">
      <SelectTrigger class="w-[calc(50%-0.25rem)] sm:w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</SelectItem>
      </SelectContent>
    </Select>
    <Select v-model="category">
      <SelectTrigger class="w-[calc(50%-0.25rem)] sm:w-44"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as categorias</SelectItem>
        <SelectItem v-for="c in categories" :key="c" :value="c">{{ c }}</SelectItem>
      </SelectContent>
    </Select>
    <Button variant="outline" as-child class="w-full sm:ml-auto sm:w-auto">
      <a :href="csvLink"><Download /> Exportar CSV</a>
    </Button>
  </div>

  <Card v-if="data && data.byCategory.length > 1" class="mb-4 gap-0 overflow-hidden p-0 shadow-sm">
    <p class="border-b bg-muted/50 px-4 py-2 text-sm font-medium">Por categoria</p>
    <Table>
      <TableBody>
        <TableRow v-for="c in data.byCategory" :key="c.category">
          <TableCell class="font-medium">{{ c.category }}</TableCell>
          <TableCell class="text-right tabular">{{ c.pieces }}</TableCell>
          <TableCell class="hidden text-right sm:table-cell"><MoneyText :cents="c.costCents" /></TableCell>
          <TableCell class="text-right"><MoneyText :cents="c.valueCents" /></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <Skeleton v-if="isPending" class="m-4 h-40" />
    <EmptyState v-else-if="!data?.rows.length" title="Nenhuma peça com esse filtro" />
    <ul v-else-if="isMobile" class="divide-y">
      <li v-for="r in data.rows" :key="r.variantId" class="flex items-start justify-between gap-3 p-3">
        <div class="min-w-0">
          <RouterLink :to="`/produtos/${r.productId}`" class="font-medium hover:underline">
            {{ r.productName }}
          </RouterLink>
          <p class="text-sm text-muted-foreground">{{ r.color }} / {{ r.size }}</p>
          <p class="text-xs text-muted-foreground">Últ. venda: {{ r.lastSale ? formatDate(r.lastSale) : 'nunca' }}</p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-lg font-semibold tabular">{{ r.stockQty }}</p>
          <StatusBadge v-if="badge(r.status)" :tone="badge(r.status)!.tone">{{ badge(r.status)!.text }}</StatusBadge>
          <p class="text-xs text-muted-foreground"><MoneyText :cents="r.stockValueCents" /></p>
        </div>
      </li>
    </ul>
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead>Peça</TableHead>
          <TableHead class="text-right">Saldo</TableHead>
          <TableHead class="text-right">Custo</TableHead>
          <TableHead class="text-right">Preço</TableHead>
          <TableHead class="text-right">Valor a custo</TableHead>
          <TableHead class="text-right">Valor a venda</TableHead>
          <TableHead class="hidden xl:table-cell">Última entrada</TableHead>
          <TableHead>Última venda</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="r in data.rows" :key="r.variantId">
          <TableCell>
            <RouterLink :to="`/produtos/${r.productId}`" class="font-medium hover:underline">
              {{ r.productName }}
            </RouterLink>
            <p class="text-xs text-muted-foreground">
              {{ r.color }} / {{ r.size }}<template v-if="r.sku"> · {{ r.sku }}</template>
            </p>
          </TableCell>
          <TableCell class="text-right">
            <span class="tabular font-semibold">{{ r.stockQty }}</span>
            <StatusBadge v-if="badge(r.status)" :tone="badge(r.status)!.tone" class="ml-2">
              {{ badge(r.status)!.text }}
            </StatusBadge>
          </TableCell>
          <TableCell class="text-right">
            <MoneyText v-if="r.costCents !== null" :cents="r.costCents" />
            <span v-else class="text-xs text-muted-foreground">sem custo</span>
          </TableCell>
          <TableCell class="text-right"><MoneyText :cents="r.priceCents" /></TableCell>
          <TableCell class="text-right">
            <MoneyText v-if="r.stockCostCents !== null" :cents="r.stockCostCents" />
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell class="text-right"><MoneyText :cents="r.stockValueCents" /></TableCell>
          <TableCell class="hidden xl:table-cell">{{ formatDate(r.lastEntry) || '—' }}</TableCell>
          <TableCell>{{ r.lastSale ? formatDate(r.lastSale) : 'nunca' }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>
</template>

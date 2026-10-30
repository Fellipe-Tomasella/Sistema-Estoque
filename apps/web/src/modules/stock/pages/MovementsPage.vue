<script setup lang="ts">
import type { StockMovementType } from '@estoque/shared'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { useRouteQuery } from '@vueuse/router'
import { computed, watch } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge, { type Tone } from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import StockTabs from '../components/StockTabs.vue'
import { useMovements, useVariant } from '../composables/useStock'

/** Histórico do estoque (RN-EST-10): o que mudou o saldo, quando e por quê. */
const PAGE_SIZE = 50
const variantId = useRouteQuery<string | undefined>('variacao', undefined)
const type = useRouteQuery<string>('tipo', 'todos')
const page = useRouteQuery('pagina', '1', { transform: Number })
watch([variantId, type], () => (page.value = 1))

const { data: variant } = useVariant(variantId)
const { data, isPending } = useMovements(variantId, () => ({
  type: type.value === 'todos' ? undefined : (type.value as StockMovementType),
  page: page.value,
  pageSize: PAGE_SIZE,
}))
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / PAGE_SIZE)))

const TYPES: Record<StockMovementType, { label: string; tone: Tone }> = {
  initial: { label: 'Saldo inicial', tone: 'neutral' },
  purchase_entry: { label: 'Entrada', tone: 'success' },
  sale: { label: 'Venda', tone: 'info' },
  sale_cancel_return: { label: 'Cancelamento', tone: 'warning' },
  return_in: { label: 'Devolução', tone: 'warning' },
  adjustment: { label: 'Acerto', tone: 'neutral' },
}
const REASONS: Record<string, string> = {
  count: 'contagem',
  loss: 'perda',
  damage: 'avaria',
  error: 'erro',
  other: 'outro',
}

/** Referência clicável (RN-EST-10): entrada ou venda de origem. */
function refLink(m: { refType: string | null; refId: string | null }) {
  if (m.refType === 'stock_entry') return { to: `/estoque/entradas?entrada=${m.refId}`, label: 'Ver entrada' }
  if (m.refType === 'sale') return { to: `/vendas/${m.refId}`, label: 'Ver venda' }
  if (m.refType === 'import') return { to: null, label: 'Importação' }
  return null
}
</script>

<template>
  <PageHeader title="Movimentos de estoque" description="Cada entrada, venda, devolução e acerto que mudou o saldo." />
  <StockTabs />

  <div class="mb-4 flex flex-wrap items-center gap-2">
    <div v-if="variantId" class="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
      <span>
        <b>{{ variant?.productName ?? '…' }}</b> {{ variant?.label }}
        <span v-if="variant" class="text-muted-foreground">· saldo {{ variant.stockQty }} un</span>
      </span>
      <button
        type="button"
        aria-label="Ver todas as peças"
        class="text-muted-foreground hover:text-foreground"
        @click="variantId = undefined"
      >
        <X class="size-4" />
      </button>
    </div>
    <Select v-model="type">
      <SelectTrigger class="w-44"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos os tipos</SelectItem>
        <SelectItem v-for="(t, value) in TYPES" :key="value" :value="value">{{ t.label }}</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 5" :key="i" class="h-10" /></div>
    <EmptyState
      v-else-if="!data?.items.length"
      title="Nenhum movimento"
      description="Nada mudou o saldo com estes filtros."
    />
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead>Data</TableHead>
          <TableHead v-if="!variantId">Peça</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead class="text-right">Qtd.</TableHead>
          <TableHead class="text-right">Saldo depois</TableHead>
          <TableHead class="hidden md:table-cell">Detalhe</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="m in data.items" :key="m.id">
          <TableCell>
            <p class="font-medium">{{ formatDate(m.businessDate) }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDateTime(m.createdAt) }}</p>
          </TableCell>
          <TableCell v-if="!variantId">
            <RouterLink :to="`/estoque/movimentos?variacao=${m.variantId}`" class="hover:underline">
              <p class="font-medium">{{ m.productName }}</p>
              <p class="text-xs text-muted-foreground">{{ m.color }} / {{ m.size }}</p>
            </RouterLink>
          </TableCell>
          <TableCell>
            <StatusBadge :tone="TYPES[m.type].tone">{{ TYPES[m.type].label }}</StatusBadge>
            <p v-if="m.adjustmentReason" class="mt-1 text-xs text-muted-foreground">
              {{ REASONS[m.adjustmentReason] }}
            </p>
          </TableCell>
          <TableCell
            :class="cn('text-right font-semibold tabular', m.quantityDelta > 0 ? 'text-emerald-700' : 'text-red-700')"
          >
            {{ m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta }}
          </TableCell>
          <TableCell class="text-right tabular">{{ m.balanceAfter }}</TableCell>
          <TableCell class="hidden text-sm text-muted-foreground md:table-cell">
            <span v-if="m.note">{{ m.note }}</span>
            <template v-if="refLink(m)">
              <RouterLink
                v-if="refLink(m)!.to"
                :to="refLink(m)!.to!"
                class="ml-1 font-medium text-brand hover:underline"
              >
                {{ refLink(m)!.label }}
              </RouterLink>
              <span v-else>{{ refLink(m)!.label }}</span>
            </template>
            <span v-if="m.createdByName" class="block text-xs">por {{ m.createdByName }}</span>
          </TableCell>
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
</template>

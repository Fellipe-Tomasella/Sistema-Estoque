<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Ban,
  CalendarDays,
  FilePlus,
  Globe,
  CheckCircle2,
  CircleDollarSign,
  ClipboardPlus,
  FileText,
  HandCoins,
  PackagePlus,
  PencilLine,
  RotateCcw,
  ShoppingBag,
  TrendingDown,
  Truck,
} from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { client, unwrap } from '@/lib/api'
import { formatBRL, formatLongDate } from '@/lib/format'
import { keys } from '@/lib/query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import AlertCard from '../components/AlertCard.vue'
import SalesChart from '../components/SalesChart.vue'
import { useDashboard } from '../composables/useDashboard'

const auth = useAuthStore()
const { data, isPending } = useDashboard()
const restock = useQuery({ queryKey: [...keys.stock, 'alerts'], queryFn: () => unwrap(client.stock.alerts.get()) })
const restockRows = computed(() => [...(restock.data.value?.out ?? []), ...(restock.data.value?.low ?? [])].slice(0, 5))
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')

/** Avisos do Início; só entram os que têm algo a fazer. */
const alerts = computed(() => {
  const a = data.value?.alerts
  if (!a) return []
  return [
    {
      count: a.webOrdersNew,
      title: 'Pedidos do site',
      description: 'Pedidos novos esperando contato.',
      tag: 'Novo',
      tone: 'info',
      icon: Globe,
      to: '/pedidos',
      linkLabel: 'Ver pedidos',
    },
    {
      count: a.outOfStock,
      title: 'Sem estoque',
      description: 'Variações com saldo zerado.',
      tag: 'Ação imediata',
      tone: 'critical',
      icon: Ban,
      to: '/produtos?estoque=sem',
    },
    {
      count: a.lowStock,
      title: 'Repor estoque',
      description: 'Variações no alerta mínimo.',
      tag: 'Repor',
      tone: 'warning',
      icon: TrendingDown,
      to: '/produtos?estoque=repor',
    },
    {
      count: a.drafts,
      title: 'Rascunhos de venda',
      description: 'Vendas iniciadas e não confirmadas.',
      tag: 'Rascunho',
      tone: 'neutral',
      icon: PencilLine,
      to: '/vender?lista=1',
    },
    {
      count: a.shippingPending,
      title: 'Aguardando envio',
      description: 'Vendas com envio ainda não despachado.',
      tag: 'Pendente',
      tone: 'warning',
      icon: Truck,
      to: '/vendas?envio=pending',
    },
    {
      count: a.returnsAwaiting,
      title: 'Retorno de peças',
      description: 'Peças que ainda estão com a cliente.',
      tag: 'Aguardando',
      tone: 'warning',
      icon: RotateCcw,
      to: '/pendencias?aba=retornos',
    },
    {
      count: a.refundsPending,
      title: 'Devoluções de valor',
      description: `Total de ${formatBRL(a.refundsPendingCents)} a devolver.`,
      tag: 'Pendente',
      tone: 'critical',
      icon: CircleDollarSign,
      to: '/pendencias?aba=devolucoes',
    },
    {
      count: a.overdueCustomers,
      title: 'Fiado em atraso',
      description: 'Clientes com data combinada vencida.',
      tag: 'Em atraso',
      tone: 'critical',
      icon: AlertTriangle,
      to: '/fiado?atraso=1',
      linkLabel: 'Ver clientes',
    },
    {
      count: a.fiscalPending,
      title: 'Pendências fiscais',
      description: 'Notas a registrar ou cancelar no emissor.',
      tag: 'Fiscal',
      tone: 'info',
      icon: FileText,
      to: '/pendencias?aba=fiscal',
    },
  ].filter((alert) => alert.count > 0) as InstanceType<typeof AlertCard>['$props'][]
})

const quickActions = [
  { to: '/pdv', title: 'PDV', text: 'Venda rápida no balcão', icon: ShoppingBag, primary: true },
  { to: '/vender?nova=1', title: 'Nova venda', text: 'Com cliente, envio e fiado', icon: FilePlus },
  { to: '/estoque/entradas/nova', title: 'Nova entrada', text: 'Mercadoria recebida', icon: ClipboardPlus },
  { to: '/fiado', title: 'Receber fiado', text: 'Pagamento total ou parcial', icon: HandCoins },
  { to: '/produtos/novo', title: 'Novo produto', text: 'Peça com cores e tamanhos', icon: PackagePlus },
]
</script>

<template>
  <PageHeader :title="`Olá${firstName ? `, ${firstName}` : ''}!`" description="Aqui está o resumo da loja hoje.">
    <template #eyebrow>
      <p v-if="data" class="mb-1 text-xs font-medium text-muted-foreground first-letter:uppercase">
        {{ formatLongDate(data.today) }}
      </p>
    </template>
  </PageHeader>

  <section class="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
    <RouterLink
      v-for="action in quickActions"
      :key="action.to"
      :to="action.to"
      :class="
        cn(
          'group flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-colors',
          action.primary
            ? 'border-brand bg-brand text-brand-foreground hover:bg-brand/90'
            : 'bg-card hover:border-zinc-300',
        )
      "
    >
      <div class="flex items-center justify-between">
        <component :is="action.icon" class="size-5" />
        <ArrowUpRight v-if="action.primary" class="size-4 opacity-80" />
        <ArrowRight v-else class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <p class="font-semibold">{{ action.title }}</p>
        <p :class="cn('text-xs', action.primary ? 'opacity-80' : 'text-muted-foreground')">{{ action.text }}</p>
      </div>
    </RouterLink>
  </section>

  <div class="mt-6 grid gap-4 2xl:grid-cols-2">
    <Card class="gap-0 overflow-hidden p-0 shadow-sm">
      <div class="flex items-center justify-between border-b bg-muted/50 px-5 py-3">
        <p class="flex items-center gap-2 font-semibold"><CalendarDays class="size-4 text-muted-foreground" /> Hoje</p>
        <RouterLink
          to="/fechamento"
          class="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          Ver fechamento do dia <ArrowRight class="size-4" />
        </RouterLink>
      </div>
      <div class="grid gap-6 p-5 sm:grid-cols-3">
        <div v-for="(metric, i) in 3" :key="i">
          <template v-if="isPending || !data"><Skeleton class="h-4 w-32" /><Skeleton class="mt-3 h-8 w-24" /></template>
          <template v-else-if="i === 0">
            <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Vendas confirmadas</p>
            <p class="mt-2 text-3xl font-semibold tabular">{{ data.todaySummary.salesCount }}</p>
          </template>
          <template v-else-if="i === 1">
            <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Total vendido</p>
            <p class="mt-2 text-3xl font-semibold"><MoneyText :cents="data.todaySummary.salesTotalCents" /></p>
          </template>
          <template v-else>
            <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">Total recebido</p>
            <p class="mt-2 text-3xl font-semibold"><MoneyText :cents="data.todaySummary.receivedCents" /></p>
            <p class="mt-1 text-xs text-muted-foreground">Na venda e de fiado. Cartão é transação registrada.</p>
          </template>
        </div>
      </div>
    </Card>
    <Card class="p-5 shadow-sm">
      <SalesChart v-if="data" :days="data.last14Days" />
      <Skeleton v-else class="h-52" />
    </Card>
  </div>

  <section class="mt-8">
    <h2 class="mb-4 text-lg font-semibold">Avisos e pendências</h2>
    <!-- só os avisos com algo a fazer; zerados não aparecem (decisão 041) -->
    <div v-if="alerts.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AlertCard v-for="alert in alerts" :key="alert.to" v-bind="alert" />
    </div>
    <Card v-else-if="data" class="flex-row items-center gap-3 p-5 text-sm shadow-sm">
      <CheckCircle2 class="size-5 text-emerald-600" /> Tudo em dia: nenhum aviso ou pendência agora.
    </Card>
    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" class="h-48 rounded-lg" />
    </div>
  </section>

  <Card v-if="restockRows.length" class="mt-8 gap-0 overflow-hidden p-0 shadow-sm">
    <div class="flex items-center justify-between px-5 py-4">
      <div>
        <p class="font-semibold">Precisa repor</p>
        <p class="text-sm text-muted-foreground">Variações sem estoque ou no mínimo.</p>
      </div>
      <RouterLink to="/produtos?estoque=repor" class="text-sm font-medium text-brand hover:underline"
        >Ver todas</RouterLink
      >
    </div>
    <Table>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead>Produto</TableHead>
          <TableHead class="hidden sm:table-cell">Cor / tamanho</TableHead>
          <TableHead class="text-right">Saldo</TableHead>
          <TableHead class="hidden text-right sm:table-cell">Mínimo</TableHead>
          <TableHead class="text-center">Situação</TableHead>
          <TableHead class="hidden text-right md:table-cell">Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in restockRows" :key="row.variantId">
          <TableCell class="font-medium">
            <RouterLink :to="`/produtos/${row.productId}`" class="hover:underline">{{ row.productName }}</RouterLink>
            <p class="text-xs font-normal text-muted-foreground sm:hidden">{{ row.color }} / {{ row.size }}</p>
          </TableCell>
          <TableCell class="hidden sm:table-cell">{{ row.color }} / {{ row.size }}</TableCell>
          <TableCell :class="cn('text-right font-semibold tabular', row.stockQty === 0 && 'text-red-700')">
            {{ row.stockQty }} un
          </TableCell>
          <TableCell class="hidden text-right text-muted-foreground tabular sm:table-cell">
            {{ row.minStock ?? '—' }}
          </TableCell>
          <TableCell class="text-center">
            <StatusBadge :tone="row.stockQty === 0 ? 'critical' : 'warning'">
              {{ row.stockQty === 0 ? 'Sem estoque' : 'Repor' }}
            </StatusBadge>
          </TableCell>
          <TableCell class="hidden text-right md:table-cell">
            <Button variant="secondary" size="sm" as-child>
              <RouterLink :to="`/estoque/entradas/nova?variacao=${row.variantId}`">+ Nova entrada</RouterLink>
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </Card>
</template>

<script setup lang="ts">
import { AlertTriangle, HandCoins, Search, Users, Wallet } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import CustomersTabs from '@/modules/customers/components/CustomersTabs.vue'
import { initials } from '@/modules/customers/composables/useCustomers'
import ReceivePanel from '../components/ReceivePanel.vue'
import { useOpenReceivables } from '../composables/useReceivables'

/** Fiado em aberto (RN-REL-03) com o painel de recebimento ao lado (no celular, tela própria). */
const router = useRouter()
const { data, isPending } = useOpenReceivables()
const onlyOverdue = useRouteQuery<string | undefined>('atraso', undefined)
const selected = useRouteQuery<string | undefined>('cliente', undefined)
const search = ref('')
const wide = useMediaQuery('(min-width: 1024px)')

const customers = computed(() =>
  (data.value?.customers ?? []).filter(
    (c) =>
      (!onlyOverdue.value || c.overdue) &&
      (!search.value || c.name.toLowerCase().includes(search.value.toLowerCase()) || c.phone?.includes(search.value)),
  ),
)
const overdueCount = computed(() => data.value?.customers.filter((c) => c.overdue).length ?? 0)

function choose(customerId: string) {
  if (wide.value) selected.value = customerId
  else router.push(`/fiado/receber?cliente=${customerId}`)
}
</script>

<template>
  <PageHeader title="Clientes e fiado" description="Quem deve, quanto e desde quando. Receba total ou parcial.">
    <template #actions>
      <Button class="bg-brand text-brand-foreground hover:bg-brand/90" as-child>
        <RouterLink to="/fiado/receber"><HandCoins /> Receber fiado</RouterLink>
      </Button>
    </template>
  </PageHeader>
  <CustomersTabs />

  <div class="grid gap-3 sm:grid-cols-3">
    <Card class="gap-1 p-5 shadow-sm">
      <p class="flex items-center justify-between text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Total em aberto <Wallet class="size-4 text-brand" />
      </p>
      <p class="text-2xl font-semibold"><MoneyText :cents="data?.totalOpenCents ?? 0" /></p>
    </Card>
    <Card class="gap-1 p-5 shadow-sm">
      <p class="flex items-center justify-between text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Clientes devendo <Users class="size-4 text-muted-foreground" />
      </p>
      <p class="text-2xl font-semibold tabular">{{ data?.customers.length ?? 0 }}</p>
    </Card>
    <Card class="gap-1 p-5 shadow-sm">
      <p class="flex items-center justify-between text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Em atraso <AlertTriangle class="size-4 text-red-600" />
      </p>
      <p :class="cn('text-2xl font-semibold tabular', overdueCount > 0 && 'text-red-700')">{{ overdueCount }}</p>
      <p class="text-xs text-muted-foreground">Só conta quem tem data combinada vencida.</p>
    </Card>
  </div>

  <div class="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
    <div class="min-w-0">
      <div class="mb-3 flex gap-2">
        <div class="relative min-w-0 flex-1">
          <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" placeholder="Buscar cliente por nome ou telefone" class="pl-9" />
        </div>
        <Button :variant="onlyOverdue ? 'default' : 'outline'" @click="onlyOverdue = onlyOverdue ? undefined : '1'">
          Só em atraso
        </Button>
      </div>

      <Card class="gap-0 overflow-hidden p-0 shadow-sm">
        <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 4" :key="i" class="h-14" /></div>
        <EmptyState
          v-else-if="!customers.length"
          :icon="Wallet"
          :title="onlyOverdue ? 'Ninguém em atraso' : 'Ninguém devendo'"
          description="Vendas no fiado aparecem aqui até serem quitadas."
        />
        <div
          v-for="c in customers"
          :key="c.customerId"
          :class="
            cn(
              'flex items-center gap-3 border-b px-4 py-3 last:border-0',
              selected === c.customerId && 'bg-brand-soft/60',
            )
          "
        >
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
          >
            {{ initials(c.name) }}
          </span>
          <RouterLink :to="`/clientes/${c.customerId}`" class="min-w-0 flex-1 hover:underline">
            <p class="truncate font-medium">{{ c.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ c.phone ?? 'sem telefone' }} · {{ c.debts }} {{ c.debts === 1 ? 'compra' : 'compras' }} · desde
              {{ formatDate(c.oldestDate) }}
            </p>
          </RouterLink>
          <div class="text-right">
            <p :class="cn('font-semibold', c.overdue && 'text-red-700')"><MoneyText :cents="c.openBalanceCents" /></p>
            <StatusBadge v-if="c.overdue" tone="critical">Em atraso</StatusBadge>
          </div>
          <Button
            size="sm"
            :variant="selected === c.customerId ? 'default' : 'secondary'"
            @click="choose(c.customerId)"
          >
            <HandCoins /> Receber
          </Button>
        </div>
      </Card>
    </div>

    <div v-if="wide" class="lg:sticky lg:top-20 lg:self-start">
      <ReceivePanel v-if="selected" :customer-id="selected" />
      <Card v-else class="items-center gap-2 p-8 text-center text-sm text-muted-foreground shadow-sm">
        <HandCoins class="size-8 text-brand" />
        Escolha uma cliente na lista para registrar o recebimento.
      </Card>
    </div>
  </div>
</template>

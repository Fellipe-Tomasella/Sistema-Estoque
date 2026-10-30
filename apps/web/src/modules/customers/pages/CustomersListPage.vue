<script setup lang="ts">
import { ChevronLeft, ChevronRight, Phone, Search, UserPlus } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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
import CustomerFormDialog from '../components/CustomerFormDialog.vue'
import CustomersTabs from '../components/CustomersTabs.vue'
import { initials, useCustomerList } from '../composables/useCustomers'

/** Todas as clientes (RN-CLI-02: homônimos sempre com telefone ao lado para diferenciar). */
const PAGE_SIZE = 30
const router = useRouter()
const q = useRouteQuery<string>('q', '')
const status = useRouteQuery<string>('situacao', 'ativas')
const page = useRouteQuery('pagina', '1', { transform: Number })
const term = refDebounced(q, 300)
watch([term, status], () => (page.value = 1))
const creating = ref(false)

const { data, isPending } = useCustomerList(() => ({
  q: term.value.trim() || undefined,
  status: status.value === 'inativas' ? 'inactive' : status.value === 'todas' ? 'all' : 'active',
  page: page.value,
  pageSize: PAGE_SIZE,
}))
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / PAGE_SIZE)))
</script>

<template>
  <PageHeader title="Clientes e fiado" description="Cadastro de clientes e o que cada uma deve.">
    <template #actions>
      <Button class="bg-brand text-brand-foreground hover:bg-brand/90" @click="creating = true"
        ><UserPlus /> Nova cliente</Button
      >
    </template>
  </PageHeader>
  <CustomersTabs />

  <div class="mb-4 flex flex-col gap-2 sm:flex-row">
    <div class="relative flex-1">
      <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="q" placeholder="Buscar por nome, telefone ou CPF/CNPJ…" class="pl-9" />
    </div>
    <Select v-model="status">
      <SelectTrigger class="sm:w-44"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ativas">Ativas</SelectItem>
        <SelectItem value="inativas">Inativas</SelectItem>
        <SelectItem value="todas">Ativas e inativas</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 5" :key="i" class="h-12" /></div>
    <EmptyState
      v-else-if="!data?.items.length"
      title="Nenhuma cliente encontrada"
      description="Mude a busca ou cadastre uma nova."
    >
      <Button @click="creating = true"><UserPlus /> Nova cliente</Button>
    </EmptyState>
    <Table v-else>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead>Cliente</TableHead>
          <TableHead class="hidden md:table-cell">CPF / CNPJ</TableHead>
          <TableHead class="text-right">Fiado em aberto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="c in data.items"
          :key="c.id"
          class="cursor-pointer"
          tabindex="0"
          @click="router.push(`/clientes/${c.id}`)"
          @keydown.enter="router.push(`/clientes/${c.id}`)"
        >
          <TableCell>
            <div class="flex items-center gap-3">
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
              >
                {{ initials(c.name) }}
              </span>
              <div class="min-w-0">
                <p class="flex items-center gap-2 font-medium">
                  <span class="truncate">{{ c.name }}</span>
                  <StatusBadge v-if="!c.active" tone="neutral">Inativa</StatusBadge>
                </p>
                <p v-if="c.phone" class="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone class="size-3" /> {{ c.phone }}
                </p>
              </div>
            </div>
          </TableCell>
          <TableCell class="hidden text-muted-foreground tabular md:table-cell">{{ c.document ?? '—' }}</TableCell>
          <TableCell class="text-right">
            <template v-if="c.openBalanceCents > 0">
              <p class="font-semibold"><MoneyText :cents="c.openBalanceCents" /></p>
              <StatusBadge v-if="c.overdue" tone="critical">Em atraso</StatusBadge>
            </template>
            <span v-else class="text-muted-foreground">—</span>
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

  <CustomerFormDialog v-model:open="creating" @saved="router.push(`/clientes/${$event.id}`)" />
</template>

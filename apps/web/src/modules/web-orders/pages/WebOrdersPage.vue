<script setup lang="ts">
import { Globe, LoaderCircle, MessageCircle, PhoneCall, ShoppingBag, Undo2, X } from '@lucide/vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useRouteQuery } from '@vueuse/router'
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { client, unwrap } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { keys, queryClient } from '@/lib/query'
import { cn } from '@/lib/utils'

type Order = Awaited<ReturnType<typeof load>>[number]

/**
 * Pedidos do site (docs/11 §5, RN-LOJ-05 a 08): chegam sem mexer no estoque; a dona fala com a cliente e
 * usa “Virar venda”, que abre a venda com a cliente e as peças para confirmar o pagamento como sempre.
 */
const router = useRouter()
const tab = useRouteQuery<'open' | 'closed'>('aba', 'open')
const highlight = useRouteQuery<string | undefined>('id')
const load = () => unwrap(client['web-orders'].get({ query: { status: tab.value } }))
const { data, isPending } = useQuery({ queryKey: computed(() => ['web-orders', tab.value]), queryFn: load })

const STATUS = {
  new: { label: 'Novo', tone: 'info' },
  contacted: { label: 'Atendido', tone: 'warning' },
  converted: { label: 'Virou venda', tone: 'success' },
  declined: { label: 'Recusado', tone: 'neutral' },
} as const

const refresh = () =>
  Promise.all([['web-orders'], keys.dashboard].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
const order = (id: string) => client['web-orders']({ id })
const setStatus = useMutation({
  mutationFn: (v: { id: string; status: 'new' | 'contacted' | 'declined'; reason?: string }) =>
    unwrap(order(v.id).status.post({ status: v.status, reason: v.reason ?? null })),
  onSuccess: refresh,
})
const convert = useMutation({
  mutationFn: (id: string) => unwrap(order(id).convert.post()),
  onSuccess: async ({ saleId }) => {
    await refresh()
    toast.success('Venda aberta com a cliente e as peças. Confira e confirme o pagamento.')
    router.push(`/vender/${saleId}`)
  },
})

const declining = ref<Order | null>(null)
const reason = ref('')
async function decline() {
  await setStatus.mutateAsync({ id: declining.value!.id, status: 'declined', reason: reason.value })
  toast.success('Pedido recusado.')
  declining.value = null
  reason.value = ''
}

const phone = (digits: string) => digits.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
const waLink = (o: Order) =>
  `https://wa.me/${o.whatsapp}?text=${encodeURIComponent(`Olá, ${o.customerName.split(' ')[0]}! Recebi seu pedido nº ${o.number} pelo site.`)}`

// Vindo do e-mail (?id=…): rola até o pedido.
watch(data, async () => {
  if (!highlight.value) return
  await nextTick()
  document.getElementById(`pedido-${highlight.value}`)?.scrollIntoView({ block: 'center' })
})
</script>

<template>
  <PageHeader title="Pedidos do site" description="Pedidos da loja virtual. Não baixam estoque até virarem venda." />

  <div class="mb-4 inline-flex rounded-md border bg-card p-1 text-sm">
    <button
      v-for="t in [
        { id: 'open', label: 'Abertos' },
        { id: 'closed', label: 'Encerrados' },
      ] as const"
      :key="t.id"
      type="button"
      :class="
        cn('rounded px-3 py-1.5 font-medium', tab === t.id ? 'bg-brand text-brand-foreground' : 'text-muted-foreground')
      "
      @click="tab = t.id"
    >
      {{ t.label }}
    </button>
  </div>

  <div v-if="isPending" class="grid gap-3 xl:grid-cols-2"><Skeleton v-for="i in 2" :key="i" class="h-56" /></div>
  <Card v-else-if="!data?.length" class="p-0 shadow-sm">
    <EmptyState
      :icon="Globe"
      :title="tab === 'open' ? 'Nenhum pedido em aberto' : 'Nenhum pedido encerrado'"
      description="Os pedidos enviados pelo site aparecem aqui e também chegam por e-mail."
    />
  </Card>

  <div v-else class="grid gap-3 xl:grid-cols-2">
    <Card
      v-for="o in data"
      :id="`pedido-${o.id}`"
      :key="o.id"
      :class="cn('gap-3 p-5 shadow-sm', highlight === o.id && 'ring-2 ring-brand')"
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="font-semibold">Pedido nº {{ o.number }} · {{ o.customerName }}</p>
          <p class="text-xs text-muted-foreground">Recebido em {{ formatDateTime(o.createdAt) }}</p>
        </div>
        <StatusBadge :tone="STATUS[o.status].tone">{{ STATUS[o.status].label }}</StatusBadge>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a
          :href="waLink(o)"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 font-medium text-brand hover:underline"
        >
          <MessageCircle class="size-4" /> {{ phone(o.whatsapp) }}
        </a>
        <span v-if="o.email" class="text-muted-foreground">{{ o.email }}</span>
        <span v-if="o.city" class="text-muted-foreground">{{ o.city }}</span>
      </div>
      <p v-if="o.notes" class="rounded-md bg-muted/50 p-2 text-sm">“{{ o.notes }}”</p>

      <ul class="divide-y rounded-md border text-sm">
        <li v-for="item in o.items" :key="item.id" class="flex items-center justify-between gap-3 px-3 py-2">
          <span class="min-w-0">
            {{ item.quantity }}× {{ item.productName }}
            <span class="text-muted-foreground">· {{ item.variantLabel }}</span>
          </span>
          <span class="shrink-0 tabular">
            <template v-if="item.unitPriceCents === null">Consulte</template>
            <MoneyText v-else :cents="item.unitPriceCents * item.quantity" />
          </span>
        </li>
      </ul>
      <p class="text-right text-sm">
        Total <strong><MoneyText :cents="o.totalCents" /></strong>
        <span v-if="o.hasHiddenPrices" class="text-muted-foreground"> + itens a consultar</span>
      </p>

      <p v-if="o.status === 'declined'" class="text-sm text-muted-foreground">Motivo: {{ o.declineReason }}</p>

      <div class="flex flex-wrap justify-end gap-2">
        <template v-if="o.status === 'new' || o.status === 'contacted'">
          <Button variant="ghost" size="sm" @click="declining = o"><X /> Recusar</Button>
          <Button
            v-if="o.status === 'new'"
            variant="outline"
            size="sm"
            :disabled="setStatus.isPending.value"
            @click="setStatus.mutate({ id: o.id, status: 'contacted' })"
          >
            <PhoneCall /> Marcar atendido
          </Button>
          <Button
            size="sm"
            class="bg-brand text-brand-foreground hover:bg-brand/90"
            :disabled="convert.isPending.value"
            @click="convert.mutate(o.id)"
          >
            <LoaderCircle v-if="convert.isPending.value && convert.variables.value === o.id" class="animate-spin" />
            <ShoppingBag v-else /> Virar venda
          </Button>
        </template>
        <Button v-else-if="o.status === 'converted' && o.saleId" variant="outline" size="sm" as-child>
          <RouterLink :to="`/vendas/${o.saleId}`">Ver venda</RouterLink>
        </Button>
        <Button
          v-else-if="o.status === 'declined'"
          variant="ghost"
          size="sm"
          @click="setStatus.mutate({ id: o.id, status: 'new' })"
        >
          <Undo2 /> Reabrir
        </Button>
      </div>
    </Card>
  </div>

  <ConfirmDialog
    :open="declining !== null"
    :title="`Recusar o pedido nº ${declining?.number ?? ''}?`"
    confirm-label="Recusar pedido"
    destructive
    :loading="setStatus.isPending.value"
    @update:open="!$event && (declining = null)"
    @confirm="decline"
  >
    <span class="mt-2 block">
      <Textarea v-model="reason" rows="2" placeholder="Motivo (ex.: cliente desistiu, peça acabou)" />
    </span>
  </ConfirmDialog>
</template>

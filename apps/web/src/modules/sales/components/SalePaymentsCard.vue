<script setup lang="ts">
import { ArrowLeftRight, Banknote, CreditCard, HandCoins, NotebookPen, QrCode, Repeat, Wallet } from '@lucide/vue'
import { ref } from 'vue'
import MoneyText from '@/components/common/MoneyText.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SaleDetail } from '../composables/useSales'
import { METHOD } from '../labels'
import ChangeMethodDialog from './ChangeMethodDialog.vue'

/** Pagamentos da venda (no ato e recebimentos do fiado) e a dívida que ficou, com atalho para receber. */
const props = defineProps<{ sale: SaleDetail }>()
const changing = ref<SaleDetail['payments'][number] | null>(null)
const icons = { pix: QrCode, cash: Banknote, card: CreditCard, exchange_credit: Repeat } as Record<
  string,
  typeof Wallet
>
const CARD: Record<string, string> = { credit: 'crédito', debit: 'débito' }
const editable = (p: SaleDetail['payments'][number]) =>
  props.sale.status === 'confirmed' && p.status === 'valid' && p.method !== 'exchange_credit'
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold"><Wallet class="size-4 text-brand" /> Pagamentos</h2>

    <p v-if="!sale.payments.length && !sale.receivable" class="text-sm text-muted-foreground">Nenhum pagamento.</p>
    <div
      v-for="p in sale.payments"
      :key="p.id"
      :class="cn('flex items-center gap-3 rounded-lg border p-3 text-sm', p.status === 'voided' && 'opacity-60')"
    >
      <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
        <component :is="icons[p.method] ?? Wallet" class="size-4" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="font-medium">
          {{ p.kind === 'receivable_receipt' ? 'Recebimento do fiado' : METHOD[p.method] }}
          <template v-if="p.kind === 'receivable_receipt'"> · {{ METHOD[p.method] }}</template>
          <template v-if="p.cardType">
            · {{ CARD[p.cardType]
            }}<template v-if="(p.installments ?? 1) > 1"> {{ p.installments }}x</template></template
          >
        </p>
        <p class="text-xs text-muted-foreground">{{ formatDateTime(p.receivedAt) }}</p>
      </div>
      <div class="text-right">
        <p :class="cn('font-semibold', p.status === 'voided' && 'line-through')">
          <MoneyText :cents="p.amountCents" />
        </p>
        <StatusBadge v-if="p.status === 'voided'" tone="neutral">Estornado</StatusBadge>
      </div>
      <Button
        v-if="editable(p)"
        variant="ghost"
        size="icon-sm"
        aria-label="Trocar forma de pagamento"
        title="Trocar forma de pagamento"
        @click="changing = p"
      >
        <ArrowLeftRight />
      </Button>
    </div>

    <div v-if="sale.receivable" class="space-y-2 rounded-lg bg-brand-soft/60 p-3 text-sm">
      <p class="flex items-center gap-2 font-medium">
        <NotebookPen class="size-4 text-brand" /> Fiado de <MoneyText :cents="sale.receivable.originalCents" />
        <StatusBadge :tone="sale.receivable.status === 'open' ? 'warning' : 'success'" class="ml-auto">
          {{
            sale.receivable.status === 'open'
              ? 'Em aberto'
              : sale.receivable.status === 'settled'
                ? 'Quitado'
                : 'Cancelado'
          }}
        </StatusBadge>
      </p>
      <p class="text-xs text-muted-foreground">
        Recebido <MoneyText :cents="sale.receivable.paidCents" />
        <template v-if="sale.receivable.adjustedCents">
          · ajustes <MoneyText :cents="sale.receivable.adjustedCents"
        /></template>
        <template v-if="sale.receivable.dueDate"> · combinado para {{ formatDate(sale.receivable.dueDate) }}</template>
      </p>
      <div v-if="sale.receivable.balanceCents > 0" class="flex items-center justify-between gap-2">
        <p>
          Saldo: <strong class="text-red-700"><MoneyText :cents="sale.receivable.balanceCents" /></strong>
        </p>
        <Button size="sm" class="bg-brand text-brand-foreground hover:bg-brand/90" as-child>
          <RouterLink :to="`/fiado/receber?cliente=${sale.customerId}`"><HandCoins /> Receber</RouterLink>
        </Button>
      </div>
    </div>

    <ChangeMethodDialog :sale-id="sale.id" :payment="changing" @close="changing = null" />
  </Card>
</template>

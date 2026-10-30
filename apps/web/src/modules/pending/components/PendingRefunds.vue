<script setup lang="ts">
import type { MoneyMethod } from '@estoque/shared'
import { Banknote, ChevronDown, CircleX, HandCoins, LoaderCircle } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatBRL, formatDate } from '@/lib/format'
import { usePendingMutations, useRefunds } from '@/modules/returns/composables/useReturns'
import { METHOD } from '@/modules/sales/labels'
import { saleLabel } from '../composables/usePending'

/** Dinheiro a devolver para a cliente (RN-DEV-07): marcar como devolvido (com a forma) ou anular com motivo. */
const { data, isPending } = useRefunds('pending')
const { refundDone, refundCancel } = usePendingMutations()
const voiding = ref<{ id: string; amountCents: number } | null>(null)
const reason = ref('')

async function done(id: string, method: MoneyMethod) {
  await refundDone.mutateAsync({ id, body: { method } })
  toast.success(`Devolução registrada (${METHOD[method]}).`)
}
async function voidRefund() {
  if (!reason.value.trim()) return toast.error('Informe o motivo.')
  await refundCancel.mutateAsync({ id: voiding.value!.id, reason: reason.value.trim() })
  toast.success('Devolução de valor anulada.')
  voiding.value = null
  reason.value = ''
}
</script>

<template>
  <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 3" :key="i" class="h-12" /></div>
  <EmptyState
    v-else-if="!data?.length"
    :icon="Banknote"
    title="Nada a devolver"
    description="Valores de cancelamentos e devoluções aparecem aqui até você devolver."
  />
  <div v-for="r in data ?? []" :key="r.id" class="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0">
    <RouterLink :to="`/vendas/${r.saleId}`" class="min-w-0 flex-1 hover:underline">
      <p class="font-semibold text-brand">
        Venda {{ saleLabel(r.saleNumber) }}
        <span class="font-normal text-foreground">· {{ r.customerName ?? 'Sem cliente' }}</span>
      </p>
      <p class="text-xs text-muted-foreground">desde {{ formatDate(r.createdAt) }}</p>
    </RouterLink>
    <p class="font-semibold text-red-700"><MoneyText :cents="r.amountCents" /></p>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button size="sm" :disabled="refundDone.isPending.value"><HandCoins /> Devolvi <ChevronDown /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem v-for="m in ['pix', 'cash', 'card'] as const" :key="m" @click="done(r.id, m)">
          Por {{ METHOD[m] }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button size="icon-sm" variant="ghost" aria-label="Anular devolução" title="Anular" @click="voiding = r">
      <CircleX class="text-muted-foreground" />
    </Button>
  </div>

  <Dialog :open="voiding !== null" @update:open="!$event && (voiding = null)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Anular devolução de {{ voiding ? formatBRL(voiding.amountCents) : '' }}?</DialogTitle>
        <DialogDescription
          >Use quando o valor não vai mais ser devolvido (ex.: virou crédito combinado).</DialogDescription
        >
      </DialogHeader>
      <div class="space-y-2">
        <Label for="refund-reason">Motivo *</Label>
        <Textarea id="refund-reason" v-model="reason" rows="2" />
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="voiding = null">Voltar</Button>
        <Button variant="destructive" :disabled="refundCancel.isPending.value" @click="voidRefund">
          <LoaderCircle v-if="refundCancel.isPending.value" class="animate-spin" /> Anular
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

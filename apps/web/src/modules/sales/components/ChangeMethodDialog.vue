<script setup lang="ts">
import type { CardType, MoneyMethod } from '@estoque/shared'
import { LoaderCircle } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatBRL } from '@/lib/format'
import { useSaleMutations } from '../composables/useSales'
import { METHOD } from '../labels'

/** Corrigir a forma de um pagamento lançado errado (RN-PAG-06): com motivo, fica no histórico. */
const props = defineProps<{
  saleId: string
  payment: { id: string; method: string; amountCents: number } | null
}>()
const emit = defineEmits<{ close: [] }>()
const { changeMethod } = useSaleMutations(() => props.saleId)

const method = ref<MoneyMethod>('pix')
const cardType = ref<CardType>('credit')
const reason = ref('')
watch(
  () => props.payment,
  (p) => {
    reason.value = ''
    method.value = p?.method === 'pix' ? 'cash' : 'pix'
  },
)

async function save() {
  if (!reason.value.trim()) return toast.error('Informe o motivo da correção.')
  await changeMethod.mutateAsync({
    paymentId: props.payment!.id,
    body: { method: method.value, cardType: method.value === 'card' ? cardType.value : null, reason: reason.value },
  })
  toast.success(`Forma de pagamento alterada para ${METHOD[method.value]}.`)
  emit('close')
}
</script>

<template>
  <Dialog :open="payment !== null" @update:open="!$event && emit('close')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Trocar forma de pagamento</DialogTitle>
        <DialogDescription v-if="payment">
          {{ METHOD[payment.method] }} de {{ formatBRL(payment.amountCents) }}. O valor não muda; só a forma.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <ToggleGroup v-model="method" type="single" variant="outline" class="grid w-full grid-cols-3">
          <ToggleGroupItem
            v-for="m in ['pix', 'cash', 'card'] as const"
            :key="m"
            :value="m"
            :disabled="m === payment?.method"
            class="data-[state=on]:bg-brand data-[state=on]:text-brand-foreground"
          >
            {{ METHOD[m] }}
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup v-if="method === 'card'" v-model="cardType" type="single" variant="outline" size="sm">
          <ToggleGroupItem value="credit" class="px-3">Crédito</ToggleGroupItem>
          <ToggleGroupItem value="debit" class="px-3">Débito</ToggleGroupItem>
        </ToggleGroup>
        <div class="space-y-2">
          <Label for="change-reason">Motivo *</Label>
          <Textarea id="change-reason" v-model="reason" rows="2" placeholder="Ex.: era Pix, lancei como dinheiro" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="emit('close')">Voltar</Button>
        <Button :disabled="changeMethod.isPending.value" @click="save">
          <LoaderCircle v-if="changeMethod.isPending.value" class="animate-spin" /> Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

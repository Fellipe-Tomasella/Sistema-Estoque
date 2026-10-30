<script setup lang="ts">
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
import { formatBRL } from '@/lib/format'
import { useReceivableMutations } from '../composables/useReceivables'

/** RN-FIA-07: estornar recebimento lançado por engano. Nada é apagado; o saldo volta. */
const props = defineProps<{ receipt: { paymentId: string; amountCents: number } | null }>()
const emit = defineEmits<{ close: [] }>()
const { void: voidReceipt } = useReceivableMutations()
const reason = ref('')
watch(
  () => props.receipt,
  () => (reason.value = ''),
)

async function confirm() {
  if (!reason.value.trim()) return toast.error('Informe o motivo do estorno.')
  await voidReceipt.mutateAsync({ id: props.receipt!.paymentId, reason: reason.value.trim() })
  toast.success('Recebimento estornado. O saldo da dívida voltou.')
  emit('close')
}
</script>

<template>
  <Dialog :open="receipt !== null" @update:open="!$event && emit('close')">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Estornar recebimento de {{ receipt ? formatBRL(receipt.amountCents) : '' }}?</DialogTitle>
        <DialogDescription>
          Use quando foi lançado por engano. O registro fica no histórico como estornado e o valor volta a ser devido.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-2">
        <Label for="void-reason">Motivo *</Label>
        <Textarea id="void-reason" v-model="reason" rows="2" placeholder="Ex.: lancei na cliente errada" />
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="emit('close')">Voltar</Button>
        <Button variant="destructive" :disabled="voidReceipt.isPending.value" @click="confirm">
          <LoaderCircle v-if="voidReceipt.isPending.value" class="animate-spin" /> Estornar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

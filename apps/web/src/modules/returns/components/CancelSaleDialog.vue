<script setup lang="ts">
import { CircleAlert, Info, LoaderCircle, PackageCheck, PackageSearch } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
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
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useCancelPreview, useReturnMutations } from '../composables/useReturns'

/**
 * Cancelar venda (RN-CAN-01…07): mostra antes o efeito (peças, fiado anulado, valor a devolver)
 * e pergunta onde estão as peças quando o sistema não sabe. Nada é apagado.
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ saleId: string; numberLabel: string }>()

const withStore = ref<boolean | undefined>(undefined)
const reason = ref('')
const { data: preview, isPending, error } = useCancelPreview(() => props.saleId, withStore, open)
const { cancel } = useReturnMutations(() => props.saleId)

watch(open, (isOpen) => {
  if (!isOpen) return
  withStore.value = undefined
  reason.value = ''
})

async function confirm() {
  if (!reason.value.trim()) return toast.error('Informe o motivo do cancelamento.')
  if (preview.value?.itemsWithStore === null) return toast.error('Diga onde estão as peças.')
  await cancel.mutateAsync({ reason: reason.value.trim(), itemsWithStore: preview.value!.itemsWithStore! })
  toast.success(`Venda ${props.numberLabel} cancelada.`)
  open.value = false
}

const locations = [
  { value: true, label: 'Estão comigo', hint: 'Voltam ao estoque agora', icon: PackageCheck },
  { value: false, label: 'Com a cliente', hint: 'Ficam aguardando retorno', icon: PackageSearch },
]
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Cancelar venda {{ numberLabel }}?</DialogTitle>
        <DialogDescription>A venda fica no histórico como cancelada, com o motivo.</DialogDescription>
      </DialogHeader>

      <div v-if="isPending" class="space-y-2"><Skeleton class="h-16" /><Skeleton class="h-10" /></div>
      <p v-else-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error.message }}</p>

      <div v-else-if="preview" class="space-y-4">
        <div class="space-y-2">
          <Label>Onde estão as peças?</Label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="l in locations"
              :key="l.label"
              type="button"
              :class="
                cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition-colors',
                  preview.itemsWithStore === l.value ? 'border-brand bg-brand-soft' : 'hover:bg-muted',
                )
              "
              @click="withStore = l.value"
            >
              <component :is="l.icon" class="size-4 text-brand" />
              <span class="font-medium">{{ l.label }}</span>
              <span class="text-xs text-muted-foreground">{{ l.hint }}</span>
            </button>
          </div>
        </div>

        <div class="space-y-1 rounded-lg border p-3 text-sm">
          <p v-for="item in preview.items" :key="item.saleItemId" class="flex justify-between gap-2">
            <span>{{ item.quantity }}× {{ item.productName }} {{ item.variantLabel }}</span>
            <MoneyText :cents="item.valueCents" />
          </p>
        </div>

        <ul class="space-y-1 rounded-lg bg-brand-soft/60 p-3 text-sm">
          <li v-for="m in preview.messages" :key="m" class="flex gap-2">
            <Info class="mt-0.5 size-4 shrink-0 text-brand" /> {{ m }}
          </li>
          <li v-if="preview.refundCents > 0" class="text-xs text-muted-foreground">
            A devolução do valor fica nas pendências até você marcar como feita.
          </li>
        </ul>
        <p v-if="preview.fiscalAlert" class="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          <CircleAlert class="mt-0.5 size-4 shrink-0" /> {{ preview.fiscalAlert }}
        </p>

        <div class="space-y-2">
          <Label for="cancel-reason">Motivo *</Label>
          <Textarea id="cancel-reason" v-model="reason" rows="2" placeholder="Ex.: cliente desistiu" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="open = false">Voltar</Button>
        <Button
          variant="destructive"
          :disabled="!preview || preview.itemsWithStore === null || cancel.isPending.value"
          @click="confirm"
        >
          <LoaderCircle v-if="cancel.isPending.value" class="animate-spin" /> Cancelar venda
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

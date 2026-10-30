<script setup lang="ts">
import { FISCAL_DOC_TYPES, type FiscalDocType } from '@estoque/shared'
import { LoaderCircle } from '@lucide/vue'
import { reactive, watch } from 'vue'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSaleMutations } from '../composables/useSales'
import { FISCAL_DOC } from '../labels'

/** Registrar a nota emitida fora do sistema (RN-FIS-06): o sistema só guarda número e data. */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ saleId: string; today: string }>()
const { registerDocument } = useSaleMutations(() => props.saleId)

const form = reactive({ docType: 'nfe' as FiscalDocType, number: '', series: '', accessKey: '', issuedAt: '' })
watch(open, (isOpen) => {
  if (isOpen) Object.assign(form, { docType: 'nfe', number: '', series: '', accessKey: '', issuedAt: props.today })
})

async function save() {
  if (!form.number.trim()) return toast.error('Informe o número da nota.')
  await registerDocument.mutateAsync({
    docType: form.docType,
    number: form.number.trim(),
    series: form.series.trim() || null,
    accessKey: form.accessKey.replace(/\s/g, '') || null,
    issuedAt: form.issuedAt,
  })
  toast.success('Nota registrada na venda.')
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Registrar nota emitida</DialogTitle>
        <DialogDescription>
          A nota é emitida no emissor da prefeitura/Sefaz. Aqui você só anota os dados para conferência.
        </DialogDescription>
      </DialogHeader>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label>Tipo</Label>
          <Select v-model="form.docType">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="t in FISCAL_DOC_TYPES" :key="t" :value="t">{{ FISCAL_DOC[t] }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label for="doc-date">Emitida em</Label>
          <Input id="doc-date" v-model="form.issuedAt" type="date" :max="today" />
        </div>
        <div class="space-y-1">
          <Label for="doc-number">Número *</Label>
          <Input id="doc-number" v-model="form.number" inputmode="numeric" />
        </div>
        <div class="space-y-1">
          <Label for="doc-series">Série</Label>
          <Input id="doc-series" v-model="form.series" />
        </div>
        <div class="col-span-2 space-y-1">
          <Label for="doc-key">Chave de acesso (opcional)</Label>
          <Input id="doc-key" v-model="form.accessKey" placeholder="44 dígitos" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="open = false">Voltar</Button>
        <Button :disabled="registerDocument.isPending.value" @click="save">
          <LoaderCircle v-if="registerDocument.isPending.value" class="animate-spin" /> Registrar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

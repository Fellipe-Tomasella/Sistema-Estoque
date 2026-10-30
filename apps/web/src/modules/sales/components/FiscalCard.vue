<script setup lang="ts">
import { FilePlus, FileText, Hand, ShieldCheck } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/format'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import { type SaleDetail, useSaleMutations } from '../composables/useSales'
import { FISCAL, FISCAL_DOC } from '../labels'
import FiscalDocumentDialog from './FiscalDocumentDialog.vue'

/** Situação fiscal (docs/07): o sistema sinaliza e guarda a nota emitida fora; não emite nota. */
const props = defineProps<{ sale: SaleDetail }>()
const { fiscalFlag } = useSaleMutations(() => props.sale.id)
const { data: dashboard } = useDashboard()
const registering = ref(false)

async function flag() {
  await fiscalFlag.mutateAsync()
  toast.success('Anotado: a cliente pediu nota. A venda foi para as pendências fiscais.')
}
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold"><ShieldCheck class="size-4 text-brand" /> Fiscal (MEI)</h2>
    <div v-if="sale.fiscal.requirement" class="space-y-2 text-sm">
      <StatusBadge :tone="FISCAL[sale.fiscal.requirement].tone">{{
        FISCAL[sale.fiscal.requirement].label
      }}</StatusBadge>
      <p class="text-muted-foreground">{{ sale.fiscal.note }}</p>
    </div>

    <div
      v-for="doc in sale.fiscalDocuments"
      :key="doc.id"
      class="flex items-center gap-3 rounded-lg border p-3 text-sm"
    >
      <FileText class="size-4 text-brand" />
      <div class="flex-1">
        <p class="font-medium">
          {{ FISCAL_DOC[doc.docType] }} nº {{ doc.number
          }}<template v-if="doc.series"> série {{ doc.series }}</template>
        </p>
        <p class="text-xs text-muted-foreground">Emitida em {{ formatDate(doc.issuedAt) }}</p>
      </div>
      <StatusBadge :tone="doc.status === 'registered' ? 'success' : 'neutral'">
        {{ doc.status === 'registered' ? 'Registrada' : 'Cancelada' }}
      </StatusBadge>
    </div>

    <template v-if="sale.status === 'confirmed'">
      <Button
        v-if="!sale.fiscal.requested && sale.fiscal.requirement !== 'required'"
        variant="outline"
        :disabled="fiscalFlag.isPending.value"
        @click="flag"
      >
        <Hand /> Cliente pediu nota
      </Button>
      <Button variant="outline" @click="registering = true"><FilePlus /> Registrar nota emitida</Button>
    </template>
    <FiscalDocumentDialog v-model:open="registering" :sale-id="sale.id" :today="dashboard?.today ?? ''" />
  </Card>
</template>

<script setup lang="ts">
import { CircleCheck, Download, FileText, Plus, Share2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { SaleView } from '../composables/useSaleDraft'

/** Venda confirmada: comprovante (não é documento fiscal), compartilhar e começar outra. */
const props = defineProps<{ sale: SaleView }>()
const emit = defineEmits<{ next: [] }>()
const pdfUrl = `/api/sales/${props.sale.id}/receipt.pdf`
const canShare = typeof navigator.share === 'function'

async function share() {
  try {
    const blob = await (await fetch(pdfUrl, { credentials: 'include' })).blob()
    const file = new File([blob], `comprovante-${props.sale.number}.pdf`, { type: 'application/pdf' })
    const data = navigator.canShare?.({ files: [file] })
      ? { files: [file], title: `Comprovante ${props.sale.numberLabel}` }
      : { url: new URL(pdfUrl, location.origin).href }
    await navigator.share(data)
  } catch (error) {
    if ((error as Error).name !== 'AbortError') toast.error('Não foi possível compartilhar. Baixe o PDF.')
  }
}
</script>

<template>
  <Card class="mx-auto max-w-md items-center gap-4 p-8 text-center shadow-sm">
    <span class="flex size-14 items-center justify-center rounded-full bg-emerald-50">
      <CircleCheck class="size-8 text-emerald-600" />
    </span>
    <div>
      <h2 class="text-xl font-semibold">Venda {{ sale.numberLabel }} confirmada</h2>
      <p class="text-sm text-muted-foreground">
        <MoneyText :cents="sale.totalCents" />
        <template v-if="sale.customer"> · {{ sale.customer.name }}</template>
        <template v-if="sale.fiado.cents"> · <MoneyText :cents="sale.fiado.cents" /> no fiado</template>
      </p>
    </div>
    <div class="grid w-full gap-2">
      <Button variant="outline" as-child>
        <a :href="pdfUrl" target="_blank" rel="noopener"><FileText /> Ver comprovante</a>
      </Button>
      <Button variant="outline" as-child>
        <a :href="pdfUrl" :download="`comprovante-${sale.number}.pdf`"><Download /> Baixar PDF</a>
      </Button>
      <Button v-if="canShare" variant="outline" @click="share"><Share2 /> Compartilhar</Button>
      <Button class="bg-brand text-brand-foreground hover:bg-brand/90" @click="emit('next')">
        <Plus /> Nova venda
      </Button>
      <Button variant="link" as-child>
        <RouterLink :to="`/vendas/${sale.id}`">Ver detalhes da venda</RouterLink>
      </Button>
    </div>
    <p class="text-xs text-muted-foreground">O comprovante não é documento fiscal.</p>
  </Card>
</template>

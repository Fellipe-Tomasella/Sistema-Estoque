<script setup lang="ts">
import { AlertTriangle, CheckCircle2, FileUp, Link2, LoaderCircle, PackagePlus, X } from '@lucide/vue'
import { useMutation } from '@tanstack/vue-query'
import { computed, ref, useTemplateRef } from 'vue'
import { toast } from 'vue-sonner'
import MoneyText from '@/components/common/MoneyText.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { client, unwrap } from '@/lib/api'
import { formatDate } from '@/lib/format'
import VariantPicker from '@/modules/products/components/VariantPicker.vue'
import type { VariantSearchResult } from '@/modules/products/types'

type Preview = Awaited<ReturnType<typeof readNote>>
type NfeItem = Preview['items'][number]
export interface NfeApplied {
  lines: { variant: VariantSearchResult; quantity: number; unitCostCents: number }[]
  supplierName: string
  reference: string
  entryDate: string | null
  nfe: {
    accessKey: string | null
    supplierDocument: string
    links: { supplierCode: string; variantId: string; barcode: string | null }[]
  }
}

/**
 * Entrada pela NF-e (RN-EST-11): lê o XML, mostra cada item com a variação sugerida (vínculo, código de
 * barras ou SKU) e deixa a dona escolher a dos que faltam ou ignorar. Nada é gravado aqui.
 */
const emit = defineEmits<{ apply: [data: NfeApplied] }>()

const readNote = (file: File) => unwrap(client.stock.entries['nfe-preview'].post({ file }))
const read = useMutation({ mutationFn: readNote })
const note = ref<Preview | null>(null)
/** Escolha por item (índice): variação, ou null = ignorar. */
const chosen = ref<Record<number, VariantSearchResult | null | undefined>>({})
const input = useTemplateRef('input')
const applying = ref(false)

const BY = { link: 'nota anterior', barcode: 'código de barras', sku: 'SKU' } as const

async function pick(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  note.value = await read.mutateAsync(file)
  chosen.value = {}
}

const variantOf = (item: NfeItem) => (item.index in chosen.value ? chosen.value[item.index] : undefined)
const resolved = (item: NfeItem) => variantOf(item) !== undefined || item.match !== null
const pending = computed(() => note.value?.items.filter((i) => !resolved(i)).length ?? 0)

async function apply() {
  if (!note.value || pending.value) return
  applying.value = true
  try {
    const lines: NfeApplied['lines'] = []
    const links: NfeApplied['nfe']['links'] = []
    for (const item of note.value.items) {
      const manual = variantOf(item)
      if (manual === null) continue // ignorado
      const variant = manual ?? (await unwrap(client.variants({ id: item.match!.variantId }).get()))
      lines.push({ variant, quantity: item.quantity, unitCostCents: item.unitCostCents })
      links.push({ supplierCode: item.code, variantId: variant.id, barcode: item.barcode })
    }
    if (!lines.length) return toast.error('Todos os itens foram ignorados.')
    const n = note.value
    emit('apply', {
      lines,
      supplierName: n.supplier.name,
      reference: `NF-e ${n.number ?? ''}${n.series ? ` série ${n.series}` : ''}`.trim(),
      entryDate: n.issuedAt,
      nfe: { accessKey: n.accessKey, supplierDocument: n.supplier.document, links },
    })
    toast.success(
      `${lines.length} ${lines.length === 1 ? 'item da nota entrou' : 'itens da nota entraram'} na entrada.`,
    )
    note.value = null
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="font-semibold">Nota fiscal do fornecedor</p>
        <p class="text-sm text-muted-foreground">Envie o XML da NF-e e as peças entram com quantidade e custo.</p>
      </div>
      <Button variant="secondary" :disabled="read.isPending.value" @click="input?.click()">
        <LoaderCircle v-if="read.isPending.value" class="animate-spin" /><FileUp v-else /> Importar XML da NF-e
      </Button>
      <input ref="input" type="file" accept=".xml,text/xml,application/xml" class="hidden" @change="pick" />
    </div>

    <template v-if="note">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 p-3 text-sm">
        <span class="font-medium">{{ note.supplier.name }}</span>
        <span class="text-muted-foreground"
          >NF-e {{ note.number }}{{ note.series ? ` · série ${note.series}` : '' }}</span
        >
        <span v-if="note.issuedAt" class="text-muted-foreground">Emitida em {{ formatDate(note.issuedAt) }}</span>
        <button
          type="button"
          class="ml-auto text-muted-foreground hover:text-foreground"
          aria-label="Fechar nota"
          @click="note = null"
        >
          <X class="size-4" />
        </button>
      </div>

      <ul class="divide-y rounded-lg border">
        <li v-for="item in note.items" :key="item.index" class="space-y-2 p-3">
          <div class="flex flex-wrap items-start gap-x-3 gap-y-1">
            <div class="min-w-0 flex-1">
              <p class="font-medium">{{ item.description }}</p>
              <p class="text-xs text-muted-foreground">
                Cód. {{ item.code }}<template v-if="item.barcode"> · EAN {{ item.barcode }}</template>
              </p>
            </div>
            <p class="text-right text-sm tabular">
              {{ item.quantity }} {{ item.unit.toLowerCase() }} × <MoneyText :cents="item.unitCostCents" />
            </p>
          </div>
          <p v-if="item.fractional" class="flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle class="size-3.5" /> Quantidade fracionada na nota: arredondada, confira na entrada.
          </p>

          <div v-if="variantOf(item) === null" class="flex items-center gap-2 text-sm text-muted-foreground">
            Ignorado (não entra no estoque).
            <button type="button" class="font-medium text-brand hover:underline" @click="delete chosen[item.index]">
              Desfazer
            </button>
          </div>
          <div v-else-if="variantOf(item)" class="flex flex-wrap items-center gap-2 text-sm">
            <CheckCircle2 class="size-4 text-emerald-600" />
            {{ variantOf(item)!.productName }} · {{ variantOf(item)!.label }}
            <button type="button" class="font-medium text-brand hover:underline" @click="delete chosen[item.index]">
              Trocar
            </button>
          </div>
          <div v-else-if="item.match" class="flex flex-wrap items-center gap-2 text-sm">
            <CheckCircle2 class="size-4 text-emerald-600" />
            {{ item.match.productName }} · {{ item.match.label }}
            <StatusBadge tone="neutral"><Link2 class="size-3" /> {{ BY[item.match.by] }}</StatusBadge>
            <button type="button" class="font-medium text-brand hover:underline" @click="item.match = null">
              Trocar
            </button>
          </div>
          <div v-else class="space-y-2">
            <p class="flex items-center gap-1 text-xs font-medium text-amber-700">
              <AlertTriangle class="size-3.5" /> Escolha a peça do estoque que corresponde a este item:
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <div class="min-w-0 flex-1 basis-64">
                <VariantPicker placeholder="Buscar peça: nome, cor e tamanho" @select="chosen[item.index] = $event" />
              </div>
              <Button variant="ghost" size="sm" as-child>
                <a :href="`/produtos/novo?nome=${encodeURIComponent(item.description)}`" target="_blank" rel="noopener">
                  <PackagePlus /> Cadastrar produto
                </a>
              </Button>
              <Button variant="ghost" size="sm" @click="chosen[item.index] = null">Ignorar</Button>
            </div>
          </div>
        </li>
      </ul>

      <div class="flex flex-wrap items-center justify-end gap-3">
        <p v-if="pending" class="text-sm text-amber-700">
          Faltam {{ pending }} {{ pending === 1 ? 'item' : 'itens' }} para escolher.
        </p>
        <Button
          class="bg-brand text-brand-foreground hover:bg-brand/90"
          :disabled="pending > 0 || applying"
          @click="apply"
        >
          <LoaderCircle v-if="applying" class="animate-spin" /> Usar estes itens na entrada
        </Button>
      </div>
    </template>
  </Card>
</template>

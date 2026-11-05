<script setup lang="ts">
import { isValidEan13 } from '@estoque/shared'
import { Printer } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { useLocalStorage } from '@vueuse/core'
import JsBarcode from 'jsbarcode'
import { computed, nextTick, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { client, unwrap } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { keys } from '@/lib/query'
import { LABEL_LAYOUTS, LABELS_KEY } from '../labels'

/** Página de impressão das etiquetas (fora do layout): nome da loja, peça, cor/tamanho, preço e código de barras. */
const wanted: { variantId: string; qty: number }[] = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(LABELS_KEY) ?? '[]')
  } catch {
    return []
  }
})()
const layoutId = useLocalStorage('etiquetas:modelo', 'a4')
const layout = computed(() => LABEL_LAYOUTS.find((l) => l.id === layoutId.value) ?? LABEL_LAYOUTS[0]!)
const showPrice = useLocalStorage('etiquetas:preco', true)

const store = useQuery({ queryKey: keys.settings, queryFn: () => unwrap(client.settings.store.get()) })
const { data } = useQuery({
  queryKey: ['products', 'codes', 'print', wanted.map((w) => w.variantId).join(',')],
  queryFn: () => unwrap(client.products.codes.get({ query: { ids: wanted.map((w) => w.variantId).join(',') } })),
  enabled: wanted.length > 0,
})
/** Uma entrada por etiqueta (a peça repetida “qty” vezes), na ordem escolhida. */
const labels = computed(() => {
  const byId = new Map((data.value ?? []).map((r) => [r.variantId, r]))
  return wanted.flatMap((w) => {
    const row = byId.get(w.variantId)
    return row?.barcode ? Array.from({ length: w.qty }, () => row) : []
  })
})

const sheet = ref<HTMLElement | null>(null)
watch([labels, layoutId], async () => {
  await nextTick()
  sheet.value?.querySelectorAll<SVGSVGElement>('svg[data-code]').forEach((svg) => {
    const code = svg.dataset.code!
    JsBarcode(svg, code, {
      format: isValidEan13(code) ? 'EAN13' : 'CODE128',
      width: layout.value.id === 'termica40' ? 1.2 : 1.5,
      height: layout.value.id === 'a4' ? 30 : 36,
      fontSize: 11,
      margin: 0,
      flat: true,
    })
  })
})

const print = () => window.print()

const pageCss = computed(
  () =>
    `@page{size:${layout.value.page};margin:${layout.value.id === 'a4' ? '10mm 7mm' : '0'}}` +
    `.label{width:${layout.value.width};height:${layout.value.height}}` +
    `.sheet{grid-template-columns:repeat(${layout.value.columns},${layout.value.width})}`,
)
</script>

<template>
  <component :is="'style'">{{ pageCss }}</component>
  <div class="toolbar flex flex-wrap items-center gap-3 border-b bg-card p-4">
    <p class="font-semibold">Etiquetas ({{ labels.length }})</p>
    <select v-model="layoutId" class="h-9 rounded-md border bg-background px-2 text-sm">
      <option v-for="l in LABEL_LAYOUTS" :key="l.id" :value="l.id">{{ l.label }}</option>
    </select>
    <label class="flex items-center gap-2 text-sm"><input v-model="showPrice" type="checkbox" /> Mostrar preço</label>
    <Button class="ml-auto bg-brand text-brand-foreground hover:bg-brand/90" :disabled="!labels.length" @click="print">
      <Printer /> Imprimir
    </Button>
  </div>
  <p v-if="!wanted.length" class="toolbar p-6 text-sm text-muted-foreground">
    Nenhuma etiqueta escolhida. Volte em Produtos e estoque → Códigos e marque as peças.
  </p>

  <div ref="sheet" class="sheet">
    <div v-for="(l, i) in labels" :key="i" class="label">
      <p class="store">{{ store.data.value?.storeName }}</p>
      <p class="name">{{ l.productName }}</p>
      <p class="meta">
        {{ l.color }} / {{ l.size
        }}<template v-if="showPrice">
          · <b>{{ formatBRL(l.priceCents) }}</b></template
        >
      </p>
      <svg :data-code="l.barcode!" class="code" />
    </div>
  </div>
</template>

<style scoped>
.sheet {
  display: grid;
  gap: 0;
  justify-content: center;
  padding: 16px 0;
}
.label {
  box-sizing: border-box;
  overflow: hidden;
  padding: 1.5mm 2mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: system-ui, sans-serif;
  color: #000;
  background: #fff;
  outline: 1px dashed #ddd;
}
.store {
  margin: 0;
  font-size: 7px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.name {
  margin: 0;
  max-width: 100%;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta {
  margin: 0 0 1px;
  font-size: 8.5px;
}
.code {
  max-width: 100%;
  height: auto;
}
@media print {
  .toolbar {
    display: none !important;
  }
  .sheet {
    padding: 0;
  }
  .label {
    outline: none;
    break-inside: avoid;
  }
}
</style>

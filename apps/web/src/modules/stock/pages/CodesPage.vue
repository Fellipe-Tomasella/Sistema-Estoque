<script setup lang="ts">
import { Barcode, LoaderCircle, Printer, Sparkles } from '@lucide/vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { client, unwrap } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { invalidateStock } from '@/lib/query'
import StockTabs from '../components/StockTabs.vue'
import { LABELS_KEY } from '../labels'

/**
 * Códigos e etiquetas (RN-PRO-15/16): referência, SKU, código de barras e códigos dos fornecedores de cada
 * peça. Gera o código de barras de quem não tem e imprime etiquetas para bipar no PDV.
 */
const q = useRouteQuery<string>('q', '')
const search = ref(q.value)
const debounced = refDebounced(search, 250)
const missing = ref(false)
const { data, isPending } = useQuery({
  queryKey: computed(() => ['products', 'codes', debounced.value, missing.value]),
  queryFn: () =>
    unwrap(
      client.products.codes.get({ query: { q: debounced.value || undefined, missing: missing.value || undefined } }),
    ),
})
const rows = computed(() => data.value ?? [])

/** Peças marcadas para etiqueta → quantas etiquetas de cada (padrão: o saldo, mínimo 1). */
const selected = reactive(new Map<string, number>())
const toggle = (id: string, stock: number, on: boolean) =>
  on ? selected.set(id, Math.max(1, stock)) : selected.delete(id)
const allOn = computed(() => rows.value.length > 0 && rows.value.every((r) => selected.has(r.variantId)))
function toggleAll(on: boolean) {
  for (const r of rows.value) toggle(r.variantId, r.stockQty, on)
}
const labelCount = computed(() => [...selected.values()].reduce((s, n) => s + n, 0))
const withoutCode = computed(() => rows.value.filter((r) => !r.barcode).length)

const generate = useMutation({
  mutationFn: (variantIds?: string[]) => unwrap(client.products.codes.generate.post({ variantIds })),
  onSuccess: async ({ generated }) => {
    await invalidateStock()
    toast.success(generated ? `${generated} código(s) gerado(s).` : 'Todas as peças já tinham código.')
  },
})

const isInternal = (code: string) => code.length === 13 && code.startsWith('20')

function print() {
  const missingCode = rows.value.filter((r) => selected.has(r.variantId) && !r.barcode)
  if (missingCode.length) return toast.error('Algumas peças marcadas não têm código de barras. Gere os códigos antes.')
  try {
    sessionStorage.setItem(LABELS_KEY, JSON.stringify([...selected].map(([variantId, qty]) => ({ variantId, qty }))))
  } catch {
    return toast.error('Não foi possível preparar a impressão neste navegador.')
  }
  window.open('/estoque/etiquetas', '_blank')
}
</script>

<template>
  <PageHeader title="Produtos e estoque" description="Códigos das peças e etiquetas com código de barras." />
  <StockTabs />

  <Card class="mb-4 gap-3 p-4 shadow-sm">
    <div class="flex flex-wrap items-center gap-3">
      <Input
        v-model="search"
        placeholder="Buscar por nome, cor, referência, SKU ou código"
        class="h-10 max-w-md min-w-0 flex-1"
      />
      <div class="flex items-center gap-2">
        <Switch id="only-missing" v-model="missing" />
        <Label for="only-missing" class="font-normal">Só sem código de barras</Label>
      </div>
      <div class="ml-auto flex flex-wrap gap-2">
        <Button variant="outline" :disabled="generate.isPending.value" @click="generate.mutate(undefined)">
          <LoaderCircle v-if="generate.isPending.value" class="animate-spin" /><Sparkles v-else /> Gerar códigos que
          faltam
        </Button>
        <Button class="bg-brand text-brand-foreground hover:bg-brand/90" :disabled="!selected.size" @click="print">
          <Printer /> Imprimir etiquetas ({{ labelCount }})
        </Button>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">
      Peça que já veio com código (etiqueta do fornecedor ou NF-e) mantém o dela. As que não têm recebem um código
      interno (começa com 20) que qualquer leitor lê.
      {{ withoutCode ? `${withoutCode} peça(s) desta lista sem código.` : '' }}
    </p>
  </Card>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <div v-if="isPending" class="space-y-2 p-4"><Skeleton v-for="i in 5" :key="i" class="h-10" /></div>
    <EmptyState
      v-else-if="!rows.length"
      :icon="Barcode"
      title="Nenhuma peça encontrada"
      description="Mude a busca ou o filtro."
    />
    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-muted/50 text-xs tracking-wider text-muted-foreground uppercase">
          <tr>
            <th class="w-10 p-3">
              <Checkbox
                :model-value="allOn"
                aria-label="Marcar todas"
                @update:model-value="toggleAll(Boolean($event))"
              />
            </th>
            <th class="p-3 text-left font-medium">Peça</th>
            <th class="p-3 text-left font-medium">Ref. / SKU</th>
            <th class="p-3 text-left font-medium">Código de barras</th>
            <th class="hidden p-3 text-left font-medium lg:table-cell">Cód. fornecedor</th>
            <th class="p-3 text-right font-medium">Saldo</th>
            <th class="p-3 text-right font-medium">Etiquetas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.variantId" class="border-t">
            <td class="p-3">
              <Checkbox
                :model-value="selected.has(r.variantId)"
                :aria-label="`Marcar ${r.productName} ${r.color} ${r.size}`"
                @update:model-value="toggle(r.variantId, r.stockQty, Boolean($event))"
              />
            </td>
            <td class="p-3">
              <RouterLink :to="`/produtos/${r.productId}`" class="font-medium hover:underline">{{
                r.productName
              }}</RouterLink>
              <p class="text-xs text-muted-foreground">{{ r.color }} / {{ r.size }} · {{ formatBRL(r.priceCents) }}</p>
            </td>
            <td class="p-3 font-mono text-xs">
              <p>{{ r.reference ?? '—' }}</p>
              <p class="text-muted-foreground">{{ r.sku ?? '—' }}</p>
            </td>
            <td class="p-3">
              <template v-if="r.barcode">
                <p class="font-mono text-xs">{{ r.barcode }}</p>
                <StatusBadge :tone="isInternal(r.barcode) ? 'info' : 'neutral'">
                  {{ isInternal(r.barcode) ? 'Interno' : 'Fornecedor' }}
                </StatusBadge>
              </template>
              <Button v-else variant="ghost" size="sm" class="-ml-2 text-brand" @click="generate.mutate([r.variantId])">
                <Sparkles /> Gerar
              </Button>
            </td>
            <td class="hidden p-3 font-mono text-xs text-muted-foreground lg:table-cell">
              {{ r.supplierCodes.join(', ') || '—' }}
            </td>
            <td class="p-3 text-right tabular">{{ r.stockQty }}</td>
            <td class="p-3 text-right">
              <Input
                v-if="selected.has(r.variantId)"
                type="number"
                min="1"
                max="500"
                class="ml-auto h-8 w-20 text-right"
                :model-value="selected.get(r.variantId)"
                @update:model-value="
                  selected.set(r.variantId, Math.max(1, Math.min(500, Math.floor(Number($event) || 1))))
                "
              />
              <span v-else class="text-muted-foreground">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>

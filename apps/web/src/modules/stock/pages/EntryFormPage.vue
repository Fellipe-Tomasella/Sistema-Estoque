<script setup lang="ts">
import { LoaderCircle, PackageCheck, Trash2 } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyInput from '@/components/common/MoneyInput.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { newIdempotencyKey } from '@/lib/api'
import { pieces } from '@/lib/format'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import VariantPicker from '@/modules/products/components/VariantPicker.vue'
import type { VariantSearchResult } from '@/modules/products/types'
import { useStockMutations, useVariant } from '../composables/useStock'

interface Line {
  variant: VariantSearchResult
  quantity: number
  unitCostCents: number | null
}

/** Entrada de mercadoria (RN-EST-03): data, fornecedor e peças recebidas. Lançada não se edita (RN-EST-04). */
const route = useRoute()
const router = useRouter()
const key = newIdempotencyKey()
const { data: dashboard } = useDashboard()
const { createEntry } = useStockMutations()

const today = computed(() => dashboard.value?.today ?? new Date().toISOString().slice(0, 10))
const form = reactive({ entryDate: '', supplierName: '', reference: '', notes: '' })
watch(today, (value) => (form.entryDate ||= value), { immediate: true })
const lines = ref<Line[]>([])

function add(variant: VariantSearchResult) {
  const existing = lines.value.find((line) => line.variant.id === variant.id)
  if (existing) existing.quantity += 1
  else lines.value.push({ variant, quantity: 1, unitCostCents: variant.costCents })
}

// Aberta a partir de uma variação (Início, produto): já vem na lista.
const { data: preselected } = useVariant(() => route.query.variacao as string | undefined)
watch(preselected, (variant) => variant && !lines.value.length && add(variant), { immediate: true })

const total = computed(() => lines.value.reduce((sum, line) => sum + line.quantity, 0))

async function save() {
  if (!lines.value.length) return toast.error('Adicione pelo menos uma peça.')
  if (form.entryDate > today.value) return toast.error('A data da entrada não pode ser no futuro.')
  const entry = await createEntry.mutateAsync({
    key,
    body: {
      entryDate: form.entryDate,
      supplierName: form.supplierName || null,
      reference: form.reference || null,
      notes: form.notes || null,
      items: lines.value.map((line) => ({
        variantId: line.variant.id,
        quantity: line.quantity,
        unitCostCents: line.unitCostCents,
      })),
    },
  })
  toast.success(`Entrada salva: +${pieces(total.value)}.`)
  router.push(`/estoque/entradas?entrada=${entry.id}`)
}
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/estoque/entradas" class="hover:text-foreground">Entradas</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">Nova entrada</span>
  </nav>
  <PageHeader title="Nova entrada de estoque" description="Registre as peças recebidas do fornecedor." />

  <div class="grid gap-4 pb-24 lg:grid-cols-[1fr_320px]">
    <Card class="gap-4 p-5 shadow-sm">
      <p class="font-semibold">Peças recebidas</p>
      <VariantPicker autofocus @select="add" />

      <EmptyState
        v-if="!lines.length"
        :icon="PackageCheck"
        title="Nenhuma peça ainda"
        description="Busque pelo nome, cor e tamanho e escolha a variação."
      />
      <div v-else class="overflow-x-auto rounded-lg border">
        <table class="w-full min-w-[520px] text-sm">
          <thead class="bg-muted/50 text-xs tracking-wider text-muted-foreground uppercase">
            <tr>
              <th class="p-3 text-left font-medium">Peça</th>
              <th class="p-3 text-right font-medium">Saldo</th>
              <th class="p-3 text-right font-medium">Quantidade</th>
              <th class="p-3 text-left font-medium">Custo un. (opcional)</th>
              <th class="w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, i) in lines" :key="line.variant.id" class="border-t">
              <td class="p-3">
                <p class="font-medium">{{ line.variant.productName }}</p>
                <p class="text-xs text-muted-foreground">{{ line.variant.label }}</p>
              </td>
              <td class="p-3 text-right text-muted-foreground tabular">
                {{ line.variant.stockQty }} → {{ line.variant.stockQty + line.quantity }}
              </td>
              <td class="p-3">
                <Input
                  type="number"
                  min="1"
                  class="ml-auto h-8 w-20 text-right"
                  :model-value="line.quantity"
                  @update:model-value="line.quantity = Math.max(1, Math.floor(Number($event) || 1))"
                />
              </td>
              <td class="p-3"><MoneyInput v-model="line.unitCostCents" class="h-8 w-32" /></td>
              <td class="p-3">
                <button
                  type="button"
                  class="text-muted-foreground hover:text-red-700"
                  :aria-label="`Remover ${line.variant.productName} ${line.variant.label}`"
                  @click="lines.splice(i, 1)"
                >
                  <Trash2 class="size-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <Card class="h-fit gap-4 p-5 shadow-sm">
      <p class="font-semibold">Dados da entrada</p>
      <div class="space-y-2">
        <Label for="entry-date">Data</Label>
        <Input id="entry-date" v-model="form.entryDate" type="date" :max="today" />
      </div>
      <div class="space-y-2">
        <Label for="supplier">Fornecedor (opcional)</Label>
        <Input id="supplier" v-model="form.supplierName" placeholder="Ex.: Malharia Paulista" />
      </div>
      <div class="space-y-2">
        <Label for="reference">Nota / pedido (opcional)</Label>
        <Input id="reference" v-model="form.reference" placeholder="Ex.: NF 1234" />
      </div>
      <div class="space-y-2">
        <Label for="notes">Observação (opcional)</Label>
        <Textarea id="notes" v-model="form.notes" rows="2" />
      </div>
    </Card>
  </div>

  <div
    class="fixed inset-x-0 bottom-14 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60 md:px-6 lg:px-10"
  >
    <div class="mx-auto flex max-w-7xl items-center gap-3">
      <p class="flex-1 text-sm">
        <span class="font-semibold">+{{ pieces(total) }}</span>
        <span class="text-muted-foreground">
          em {{ lines.length }} {{ lines.length === 1 ? 'variação' : 'variações' }}
        </span>
      </p>
      <Button variant="secondary" @click="router.back()">Cancelar</Button>
      <Button
        class="bg-brand text-brand-foreground hover:bg-brand/90"
        :disabled="createEntry.isPending.value"
        @click="save"
      >
        <LoaderCircle v-if="createEntry.isPending.value" class="animate-spin" /> Salvar entrada
      </Button>
    </div>
  </div>
</template>

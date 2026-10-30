<script setup lang="ts">
import type { ItemCondition, MoneyMethod } from '@estoque/shared'
import { ArrowLeftRight, CircleAlert, Info, LoaderCircle, Minus, Plus, Trash2, Undo2 } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { newIdempotencyKey } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import VariantPicker from '@/modules/products/components/VariantPicker.vue'
import type { VariantSearchResult } from '@/modules/products/types'
import { useSale } from '@/modules/sales/composables/useSales'
import { METHOD } from '@/modules/sales/labels'
import { type ReturnBody, useReturnMutations } from '../composables/useReturns'

/**
 * Devolução parcial ou troca (RN-DEV-01…09): escolhe as peças que voltam (e se já chegaram),
 * e na troca as peças novas; a diferença se paga, vira crédito no fiado ou valor a devolver.
 */
const route = useRoute()
const router = useRouter()
const saleId = computed(() => route.params.id as string)
const { data: sale, isPending } = useSale(saleId)
const { preview, execute } = useReturnMutations(saleId)

const mode = ref<'return' | 'exchange'>(route.query.troca ? 'exchange' : 'return')
const lines = reactive<Record<string, { quantity: number; received: boolean; condition: ItemCondition }>>({})
const newItems = ref<{ variantId: string; name: string; quantity: number }[]>([])
const payment = reactive({ method: 'pix' as MoneyMethod, confirmed: false, fiado: false })
const reason = ref('')
let key = newIdempotencyKey()
const paymentId = newIdempotencyKey()

const available = computed(() =>
  (sale.value?.items ?? [])
    .map((i) => ({ ...i, remaining: i.quantity - i.returnedQty }))
    .filter((i) => i.remaining > 0),
)
const line = (id: string) => (lines[id] ??= { quantity: 0, received: true, condition: 'sellable' })

function addNew(v: VariantSearchResult) {
  const found = newItems.value.find((i) => i.variantId === v.id)
  if (found) found.quantity++
  else newItems.value.push({ variantId: v.id, name: `${v.productName} ${v.label}`, quantity: 1 })
}

const toPay = computed(() => preview.data.value?.newSale?.toPayCents ?? 0)
const body = computed<ReturnBody | null>(() => {
  const items = Object.entries(lines)
    .filter(([, l]) => l.quantity > 0)
    .map(([saleItemId, l]) => ({
      saleItemId,
      quantity: l.quantity,
      received: l.received,
      condition: l.received ? l.condition : undefined,
    }))
  if (!items.length) return null
  const exchange =
    mode.value === 'exchange' && newItems.value.length
      ? {
          items: newItems.value.map(({ variantId, quantity }) => ({ variantId, quantity })),
          payments:
            toPay.value > 0 && !payment.fiado
              ? [
                  {
                    id: paymentId,
                    method: payment.method,
                    amountCents: toPay.value,
                    confirmed: payment.method === 'cash' || payment.confirmed,
                  },
                ]
              : [],
          fiado: payment.fiado,
        }
      : undefined
  return { items, reason: reason.value.trim() || null, exchange }
})

watchDebounced(body, (value) => (value ? preview.mutate(value) : preview.reset()), { debounce: 300, deep: true })

const blockers = computed(() => preview.data.value?.newSale?.blockers ?? [])
const canSave = computed(
  () =>
    Boolean(body.value && preview.data.value && !preview.isPending.value && !preview.error.value) &&
    !blockers.value.length &&
    (mode.value === 'return' || newItems.value.length > 0),
)

async function save() {
  if (!canSave.value) return
  const result = await execute.mutateAsync({ key, body: body.value! })
  key = newIdempotencyKey()
  toast.success(mode.value === 'exchange' ? 'Troca registrada.' : 'Devolução registrada.')
  router.push(`/vendas/${result.exchangeSale?.id ?? saleId.value}`)
}
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/vendas" class="hover:text-foreground">Vendas</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <RouterLink :to="`/vendas/${saleId}`" class="hover:text-foreground">{{ sale?.numberLabel ?? 'Venda' }}</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">Devolver ou trocar</span>
  </nav>
  <PageHeader
    title="Devolver ou trocar"
    description="Escolha as peças que voltam. Na troca, escolha as que a cliente leva."
  />

  <Skeleton v-if="isPending" class="h-64" />
  <div v-else-if="sale" class="grid gap-4 lg:grid-cols-[1fr_380px]">
    <div class="space-y-4">
      <ToggleGroup v-model="mode" type="single" variant="outline" class="grid w-full grid-cols-2 sm:w-80">
        <ToggleGroupItem value="return" class="data-[state=on]:bg-brand data-[state=on]:text-brand-foreground">
          <Undo2 /> Devolução
        </ToggleGroupItem>
        <ToggleGroupItem value="exchange" class="data-[state=on]:bg-brand data-[state=on]:text-brand-foreground">
          <ArrowLeftRight /> Troca
        </ToggleGroupItem>
      </ToggleGroup>

      <Card class="gap-3 p-5 shadow-sm">
        <h2 class="font-semibold">Peças que voltam</h2>
        <p v-if="!available.length" class="text-sm text-muted-foreground">Todas as peças já foram devolvidas.</p>
        <div v-for="item in available" :key="item.id" class="space-y-2 rounded-lg border p-3 text-sm">
          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1">
              <p class="font-medium">{{ item.productName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ item.variantLabel }} · comprou {{ item.remaining }} · <MoneyText :cents="item.unitPriceCents" /> un
              </p>
            </div>
            <div class="flex items-center rounded-md border">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Menos"
                :disabled="line(item.id).quantity <= 0"
                @click="line(item.id).quantity--"
              >
                <Minus />
              </Button>
              <span class="w-7 text-center tabular">{{ line(item.id).quantity }}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mais"
                :disabled="line(item.id).quantity >= item.remaining"
                @click="line(item.id).quantity++"
              >
                <Plus />
              </Button>
            </div>
          </div>
          <div v-if="line(item.id).quantity > 0" class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2">
              <Checkbox
                :model-value="line(item.id).received"
                @update:model-value="line(item.id).received = $event === true"
              />
              Já chegou
            </label>
            <ToggleGroup
              v-if="line(item.id).received"
              v-model="line(item.id).condition"
              type="single"
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="sellable" class="px-3">Boa para venda</ToggleGroupItem>
              <ToggleGroupItem value="damaged" class="px-3">Com defeito</ToggleGroupItem>
            </ToggleGroup>
            <span v-else class="text-xs text-muted-foreground">Fica aguardando retorno nas pendências.</span>
          </div>
        </div>
      </Card>

      <Card v-if="mode === 'exchange'" class="gap-3 p-5 shadow-sm">
        <h2 class="font-semibold">Peças que a cliente leva</h2>
        <VariantPicker @select="addNew" />
        <div
          v-for="(n, i) in newItems"
          :key="n.variantId"
          class="flex items-center gap-2 rounded-lg border p-3 text-sm"
        >
          <span class="flex-1 font-medium">{{ n.name }}</span>
          <div class="flex items-center rounded-md border">
            <Button variant="ghost" size="icon-sm" aria-label="Menos" :disabled="n.quantity <= 1" @click="n.quantity--">
              <Minus />
            </Button>
            <span class="w-7 text-center tabular">{{ n.quantity }}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Mais" @click="n.quantity++"><Plus /></Button>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Remover" @click="newItems.splice(i, 1)">
            <Trash2 class="text-muted-foreground" />
          </Button>
        </div>
      </Card>

      <Card class="gap-2 p-5 shadow-sm">
        <Label for="return-reason">Motivo (opcional)</Label>
        <Textarea id="return-reason" v-model="reason" rows="2" placeholder="Ex.: não serviu" />
      </Card>
    </div>

    <Card class="gap-4 p-5 shadow-sm lg:sticky lg:top-20 lg:self-start">
      <h2 class="font-semibold">Resumo</h2>
      <p v-if="!body" class="text-sm text-muted-foreground">Escolha ao menos uma peça que volta.</p>
      <template v-else-if="preview.data.value">
        <p class="flex justify-between text-sm">
          Valor das peças que voltam <MoneyText :cents="preview.data.value.itemsValueCents" />
        </p>
        <template v-if="preview.data.value.newSale">
          <p class="flex justify-between text-sm">
            Peças novas <MoneyText :cents="preview.data.value.newSale.totalCents" />
          </p>
          <p v-if="toPay > 0" class="flex justify-between font-semibold">
            Cliente paga a diferença <MoneyText :cents="toPay" />
          </p>
          <div v-if="toPay > 0" class="space-y-2 rounded-lg border p-3">
            <ToggleGroup
              v-model="payment.method"
              type="single"
              variant="outline"
              size="sm"
              :disabled="payment.fiado"
              class="grid w-full grid-cols-3"
            >
              <ToggleGroupItem v-for="m in ['pix', 'cash', 'card'] as const" :key="m" :value="m">
                {{ METHOD[m] }}
              </ToggleGroupItem>
            </ToggleGroup>
            <label v-if="payment.method !== 'cash' && !payment.fiado" class="flex items-center gap-2 text-sm">
              <Checkbox :model-value="payment.confirmed" @update:model-value="payment.confirmed = $event === true" />
              {{ payment.method === 'pix' ? 'Pix recebido e conferido' : 'Aprovado na maquininha' }}
            </label>
            <div class="flex items-center justify-between text-sm">
              <Label for="exchange-fiado">Deixar a diferença no fiado</Label>
              <Switch id="exchange-fiado" v-model="payment.fiado" />
            </div>
          </div>
        </template>
        <ul class="space-y-1 rounded-lg bg-brand-soft/60 p-3 text-sm">
          <li v-for="m in preview.data.value.messages" :key="m" class="flex gap-2">
            <Info class="mt-0.5 size-4 shrink-0 text-brand" /> {{ m }}
          </li>
        </ul>
        <ul v-if="blockers.length" class="space-y-1">
          <li v-for="b in blockers" :key="b" class="flex gap-2 text-xs text-red-700">
            <CircleAlert class="size-3.5 shrink-0" /> {{ b }}
          </li>
        </ul>
      </template>
      <p v-if="preview.error.value" class="rounded-md bg-red-50 p-3 text-sm text-red-700">
        {{ preview.error.value.message }}
      </p>
      <Button
        class="h-11 bg-brand text-brand-foreground hover:bg-brand/90"
        :disabled="!canSave || execute.isPending.value"
        @click="save"
      >
        <LoaderCircle v-if="execute.isPending.value" class="animate-spin" />
        {{ mode === 'exchange' ? 'Confirmar troca' : 'Confirmar devolução' }}
        <template v-if="toPay > 0 && !payment.fiado"> ({{ formatBRL(toPay) }})</template>
      </Button>
    </Card>
  </div>
</template>

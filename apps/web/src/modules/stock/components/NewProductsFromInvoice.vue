<script setup lang="ts">
import { matchKey } from '@estoque/shared'
import { LoaderCircle, PackagePlus } from '@lucide/vue'
import { useMutation } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import MoneyInput from '@/components/common/MoneyInput.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { client, unwrap } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { invalidateStock } from '@/lib/query'

export interface InvoiceItem {
  index: number
  quantity: number
  unitCostCents: number
  parsed: { name: string; color: string; size: string }
}
interface Group {
  name: string
  category: string
  costCents: number
  priceCents: number | null
  variants: { color: string; size: string; quantity: number }[]
  /** Itens da nota deste produto (para ligar cada um à variação criada). */
  items: { index: number; color: string; size: string }[]
}

/**
 * Cadastrar de uma vez os produtos da nota que ainda não existem (RN-EST-12): agrupa por produto, com as cores e
 * tamanhos da nota e o custo dela; a dona só confere o nome e define o preço de venda (com uma margem sugerida).
 */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ items: InvoiceItem[] }>()
/** Item da nota (índice) → id da variação criada. */
const emit = defineEmits<{ created: [byItem: Record<number, string>] }>()

const markup = ref(2)
const groups = ref<Group[]>([])
/** Preço sugerido: custo × margem, arredondado para terminar em ,90. */
const suggest = (cost: number) => Math.max(90, Math.ceil((cost * markup.value) / 100) * 100 - 10)

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const byName = new Map<string, Group>()
    for (const item of props.items) {
      const key = matchKey(item.parsed.name)
      const group =
        byName.get(key) ??
        byName
          .set(key, { name: item.parsed.name, category: '', costCents: 0, priceCents: null, variants: [], items: [] })
          .get(key)!
      group.costCents = Math.max(group.costCents, item.unitCostCents)
      group.items.push({ index: item.index, color: item.parsed.color, size: item.parsed.size })
      if (!group.variants.some((v) => matchKey(v.color, v.size) === matchKey(item.parsed.color, item.parsed.size))) {
        group.variants.push({ color: item.parsed.color, size: item.parsed.size, quantity: 0 })
      }
      group.variants.find(
        (v) => matchKey(v.color, v.size) === matchKey(item.parsed.color, item.parsed.size),
      )!.quantity += item.quantity
    }
    groups.value = [...byName.values()].map((g) => ({ ...g, priceCents: suggest(g.costCents) }))
  },
  { immediate: true },
)
const applyMarkup = () => groups.value.forEach((g) => (g.priceCents = suggest(g.costCents)))
const missingPrice = computed(() => groups.value.some((g) => !g.priceCents || !g.name.trim()))

const create = useMutation({
  mutationFn: () =>
    unwrap(
      client.products['from-invoice'].post({
        products: groups.value.map((g) => ({
          name: g.name.trim(),
          category: g.category.trim() || null,
          basePriceCents: g.priceCents!,
          costCents: g.costCents,
          variants: g.variants.map(({ color, size }) => ({ color, size })),
        })),
      }),
    ),
  onSuccess: async (created) => {
    await invalidateStock()
    const byKey = new Map(created.map((c) => [matchKey(c.name, c.color, c.size), c.variantId]))
    // o nome pode ter sido ajustado na tela: cada grupo sabe quais itens da nota são dele
    const byItem: Record<number, string> = {}
    for (const g of groups.value) {
      for (const item of g.items) {
        const id = byKey.get(matchKey(g.name.trim(), item.color, item.size))
        if (id) byItem[item.index] = id
      }
    }
    emit('created', byItem)
    toast.success(`${created.length} variação(ões) cadastrada(s). Agora é só usar os itens na entrada.`)
    open.value = false
  },
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90svh] max-w-2xl gap-4 overflow-y-auto">
      <DialogTitle class="flex items-center gap-2"
        ><PackagePlus class="size-5" /> Cadastrar produtos novos da nota</DialogTitle
      >
      <DialogDescription>
        Agrupei por produto com as cores e tamanhos da nota e o custo dela. Confira o nome e defina o preço de venda. O
        estoque entra quando você salvar a entrada.
      </DialogDescription>

      <div class="flex flex-wrap items-end gap-3 rounded-md bg-muted/50 p-3">
        <div class="space-y-1">
          <Label for="markup">Margem sugerida (custo ×)</Label>
          <Input id="markup" v-model.number="markup" type="number" min="1" step="0.1" class="h-9 w-24" />
        </div>
        <Button variant="secondary" size="sm" @click="applyMarkup">Aplicar a todos</Button>
      </div>

      <div v-for="(g, i) in groups" :key="i" class="space-y-3 rounded-lg border p-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div class="space-y-1">
            <Label :for="`name-${i}`">Produto</Label>
            <Input :id="`name-${i}`" v-model="g.name" />
          </div>
          <div class="space-y-1">
            <Label :for="`cat-${i}`">Categoria (opcional)</Label>
            <Input :id="`cat-${i}`" v-model="g.category" placeholder="Ex.: Pijamas" />
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="v in g.variants" :key="`${v.color}-${v.size}`" class="rounded-md bg-muted px-2 py-1 text-xs">
            {{ v.color }} / {{ v.size }} <b>· {{ v.quantity }} un</b>
          </span>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:max-w-sm">
          <div class="space-y-1">
            <Label>Custo (da nota)</Label>
            <p class="h-9 py-2 text-sm tabular">{{ formatBRL(g.costCents) }}</p>
          </div>
          <div class="space-y-1">
            <Label :for="`price-${i}`">Preço de venda</Label>
            <MoneyInput :id="`price-${i}`" v-model="g.priceCents" class="h-9" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="open = false">Cancelar</Button>
        <Button
          class="bg-brand text-brand-foreground hover:bg-brand/90"
          :disabled="missingPrice || create.isPending.value"
          @click="create.mutate()"
        >
          <LoaderCircle v-if="create.isPending.value" class="animate-spin" />
          Cadastrar {{ groups.length }} produto(s)
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { BellRing, Pencil, Power, PowerOff, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import StockStatusBadge from '../components/StockStatusBadge.vue'
import ProductPhotos from '../components/ProductPhotos.vue'
import ProductSiteCard from '../components/ProductSiteCard.vue'
import VariantActions from '../components/VariantActions.vue'
import VariantEditDialog from '../components/VariantEditDialog.vue'
import VariantGrid from '../components/VariantGrid.vue'
import { useProduct, useProductMutations } from '../composables/useProducts'
import type { Variant } from '../types'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const { data: product, isPending } = useProduct(id)
const { setActive, remove, removeVariant, setMinStock } = useProductMutations()

const editing = ref<Variant | null>(null)
const editOpen = ref(false)
const confirmRemove = ref(false)
const confirmToggle = ref(false)
const removingVariant = ref<Variant | null>(null)
const minForAll = ref<number | null>(null)

function edit(variant: Variant) {
  editing.value = variant
  editOpen.value = true
}

async function toggleActive() {
  const active = !product.value!.active
  await setActive.mutateAsync({ id: id.value, active })
  toast.success(active ? 'Produto reativado.' : 'Produto inativado: saiu do PDV e das listas padrão.')
  confirmToggle.value = false
}

async function removeProduct() {
  try {
    await remove.mutateAsync(id.value)
    toast.success('Produto excluído.')
    router.replace('/produtos')
  } finally {
    confirmRemove.value = false
  }
}

async function removeOneVariant() {
  try {
    await removeVariant.mutateAsync(removingVariant.value!.id)
    toast.success('Variação excluída.')
  } finally {
    removingVariant.value = null
  }
}

async function applyMinForAll() {
  await setMinStock.mutateAsync({ id: id.value, minStock: minForAll.value })
  toast.success(
    minForAll.value === null ? 'Alerta mínimo removido.' : `Alerta mínimo ${minForAll.value} em todas as variações.`,
  )
}
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/produtos" class="hover:text-foreground">Produtos e estoque</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">{{ product?.name ?? 'Produto' }}</span>
  </nav>

  <template v-if="isPending"> <Skeleton class="h-10 w-64" /><Skeleton class="mt-6 h-64 rounded-lg" /> </template>

  <template v-else-if="product">
    <PageHeader :title="product.name">
      <template #eyebrow>
        <div class="mb-1 flex flex-wrap gap-2">
          <StatusBadge v-if="!product.active" tone="neutral">Inativo</StatusBadge>
          <StatusBadge v-if="product.category" tone="info">{{ product.category }}</StatusBadge>
        </div>
      </template>
      <template #actions>
        <Button variant="outline" as-child>
          <RouterLink :to="`/produtos/${product.id}/editar`"><Pencil /> Editar</RouterLink>
        </Button>
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline"><BellRing /> Mínimo para todas</Button>
          </PopoverTrigger>
          <PopoverContent class="w-64 space-y-3">
            <p class="text-sm font-medium">Alerta mínimo para todas as variações</p>
            <Input
              type="number"
              min="0"
              placeholder="Vazio = sem alerta"
              :model-value="minForAll ?? ''"
              @update:model-value="minForAll = $event === '' ? null : Math.max(0, Math.floor(Number($event)))"
            />
            <Button class="w-full" :disabled="setMinStock.isPending.value" @click="applyMinForAll">Aplicar</Button>
          </PopoverContent>
        </Popover>
        <Button variant="outline" @click="confirmToggle = true">
          <component :is="product.active ? PowerOff : Power" /> {{ product.active ? 'Inativar' : 'Reativar' }}
        </Button>
        <Button variant="destructive" @click="confirmRemove = true"><Trash2 /> Excluir</Button>
      </template>
    </PageHeader>

    <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card class="gap-0 overflow-hidden p-0 shadow-sm">
        <div class="flex items-center justify-between px-5 py-4">
          <p class="font-semibold">Variações</p>
          <Button variant="secondary" size="sm" as-child>
            <RouterLink :to="`/produtos/${product.id}/editar`">+ Cor ou tamanho</RouterLink>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow class="bg-muted/50">
              <TableHead>Variação</TableHead>
              <TableHead class="text-center">Situação</TableHead>
              <TableHead class="hidden text-right md:table-cell">Mínimo</TableHead>
              <TableHead class="text-right">Saldo</TableHead>
              <TableHead class="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="variant in product.variants" :key="variant.id">
              <TableCell>
                <p class="font-medium">{{ variant.label }}</p>
                <p class="text-xs text-muted-foreground">
                  <MoneyText :cents="variant.effectivePriceCents" />
                  <template v-if="variant.priceCents !== null"> (preço próprio)</template>
                  <template v-if="variant.sku"> · SKU {{ variant.sku }}</template>
                </p>
              </TableCell>
              <TableCell class="text-center">
                <StockStatusBadge :status="variant.stockStatus" :active="variant.active" />
              </TableCell>
              <TableCell class="hidden text-right text-muted-foreground tabular md:table-cell">
                {{ variant.minStock ?? '—' }}
              </TableCell>
              <TableCell
                :class="cn('text-right font-semibold tabular', variant.stockStatus === 'out' && 'text-red-700')"
              >
                {{ variant.stockQty }} un
              </TableCell>
              <TableCell>
                <div class="flex items-center justify-end gap-1">
                  <VariantActions :variant-id="variant.id" class="hidden sm:flex" />
                  <Button variant="ghost" size="icon-sm" aria-label="Editar variação" @click="edit(variant)">
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="hover:text-red-700"
                    aria-label="Excluir variação"
                    @click="removingVariant = variant"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <div class="space-y-4">
        <ProductPhotos :product="product" />
        <ProductSiteCard :product="product" />
        <Card class="gap-3 p-5 shadow-sm">
          <p class="font-semibold">Grade cor × tamanho</p>
          <VariantGrid :variants="product.variants" @select="edit" />
        </Card>
        <Card class="gap-2 p-5 text-sm shadow-sm">
          <p class="mb-1 font-semibold">Dados do produto</p>
          <p class="flex justify-between">
            <span class="text-muted-foreground">Preço base</span> {{ formatBRL(product.basePriceCents) }}
          </p>
          <p class="flex justify-between">
            <span class="text-muted-foreground">Custo</span>
            {{ product.costCents !== null ? formatBRL(product.costCents) : '—' }}
          </p>
          <p class="flex justify-between">
            <span class="text-muted-foreground">Referência</span> {{ product.reference ?? '—' }}
          </p>
          <p class="flex justify-between">
            <span class="text-muted-foreground">Saldo total</span> {{ product.totalStock }} un
          </p>
          <p v-if="product.description" class="mt-2 border-t pt-2 text-muted-foreground">{{ product.description }}</p>
        </Card>
      </div>
    </div>

    <VariantEditDialog v-model:open="editOpen" :variant="editing" :base-price-cents="product.basePriceCents" />
    <ConfirmDialog
      v-model:open="confirmToggle"
      :title="product.active ? 'Inativar produto?' : 'Reativar produto?'"
      :description="
        product.active
          ? 'Ele sai do PDV e das listas padrão, mas continua no histórico e nos relatórios. Dá para reativar depois.'
          : 'Ele volta para o PDV e para as listas.'
      "
      :confirm-label="product.active ? 'Inativar' : 'Reativar'"
      :loading="setActive.isPending.value"
      @confirm="toggleActive"
    />
    <ConfirmDialog
      v-model:open="confirmRemove"
      title="Excluir produto?"
      description="Só é possível excluir cadastro errado, sem nenhuma movimentação ou venda. Se já houve, use Inativar."
      confirm-label="Excluir"
      destructive
      :loading="remove.isPending.value"
      @confirm="removeProduct"
    />
    <ConfirmDialog
      :open="removingVariant !== null"
      :title="`Excluir ${removingVariant?.label ?? ''}?`"
      description="Só é possível excluir variação sem movimentação nem venda. Se já houve, edite e desmarque “À venda”."
      confirm-label="Excluir"
      destructive
      :loading="removeVariant.isPending.value"
      @update:open="!$event && (removingVariant = null)"
      @confirm="removeOneVariant"
    />
  </template>
</template>

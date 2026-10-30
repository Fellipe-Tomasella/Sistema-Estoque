<script setup lang="ts">
import { ChevronLeft, ChevronRight, LayoutGrid, PackagePlus, Rows3, SlidersHorizontal, Upload } from '@lucide/vue'
import { refDebounced, useLocalStorage } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { computed, watch } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import StockTabs from '@/modules/stock/components/StockTabs.vue'
import ProductCard from '../components/ProductCard.vue'
import ProductFilters from '../components/ProductFilters.vue'
import { ALL } from '../filters'
import { useProductList } from '../composables/useProducts'

const PAGE_SIZE = 20

// Filtros na URL: dá para voltar, recarregar e chegar pelos cartões do Início (ex.: ?estoque=repor).
const q = useRouteQuery<string>('q', '')
const color = useRouteQuery<string>('cor', ALL)
const size = useRouteQuery<string>('tamanho', ALL)
const category = useRouteQuery<string>('categoria', ALL)
const stock = useRouteQuery<string>('estoque', ALL)
const status = useRouteQuery<string>('situacao', 'ativos')
const page = useRouteQuery('pagina', '1', { transform: Number })
const view = useLocalStorage<'table' | 'grid'>('produtos-visao', 'table')

const term = refDebounced(q, 300)
watch([term, color, size, category, stock, status], () => (page.value = 1))

const filters = computed(() => ({
  q: term.value.trim() || undefined,
  color: color.value === ALL ? undefined : color.value,
  size: size.value === ALL ? undefined : size.value,
  category: category.value === ALL ? undefined : category.value,
  stock: stock.value === 'sem' ? ('out' as const) : stock.value === 'repor' ? ('low' as const) : undefined,
  status:
    status.value === 'inativos' ? ('inactive' as const) : status.value === ALL ? ('all' as const) : ('active' as const),
  page: page.value,
  pageSize: PAGE_SIZE,
}))

const { data, isPending } = useProductList(filters)
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / PAGE_SIZE)))
const pieces = computed(() => data.value?.items.reduce((sum, p) => sum + p.totalStock, 0) ?? 0)
</script>

<template>
  <PageHeader title="Produtos e estoque" description="Modelos, variações por cor e tamanho e saldo de cada uma.">
    <template #actions>
      <Button variant="outline" as-child>
        <RouterLink to="/estoque/importar"><Upload /> Importar planilha</RouterLink>
      </Button>
      <Button variant="outline" as-child>
        <RouterLink to="/estoque/acertos/novo"><SlidersHorizontal /> Acerto</RouterLink>
      </Button>
      <Button class="bg-brand text-brand-foreground hover:bg-brand/90" as-child>
        <RouterLink to="/produtos/novo"><PackagePlus /> Novo produto</RouterLink>
      </Button>
    </template>
  </PageHeader>

  <div class="flex flex-wrap items-start justify-between gap-2">
    <StockTabs />
    <ToggleGroup v-model="view" type="single" variant="outline" class="mb-6" aria-label="Forma de exibir">
      <ToggleGroupItem value="table" aria-label="Tabela"
        ><Rows3 /> <span class="hidden sm:inline">Tabela</span></ToggleGroupItem
      >
      <ToggleGroupItem value="grid" aria-label="Grade cor × tamanho">
        <LayoutGrid /> <span class="hidden sm:inline">Grade</span>
      </ToggleGroupItem>
    </ToggleGroup>
  </div>

  <ProductFilters
    v-model:q="q"
    v-model:color="color"
    v-model:size="size"
    v-model:category="category"
    v-model:stock="stock"
    v-model:status="status"
  />

  <div v-if="isPending" class="space-y-3">
    <Skeleton v-for="i in 3" :key="i" class="h-40 rounded-lg" />
  </div>
  <EmptyState
    v-else-if="!data?.items.length"
    title="Nenhum produto encontrado"
    description="Mude os filtros ou cadastre um produto novo."
  >
    <Button as-child><RouterLink to="/produtos/novo">Cadastrar produto</RouterLink></Button>
  </EmptyState>
  <div v-else class="space-y-3">
    <ProductCard v-for="product in data.items" :key="product.id" :product="product" :view="view ?? 'table'" />
  </div>

  <div
    v-if="data?.items.length"
    class="mt-4 flex flex-col gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center"
  >
    <p class="flex-1 text-muted-foreground">
      {{ data.total }} {{ data.total === 1 ? 'produto' : 'produtos' }} · {{ pieces }} peças nesta página
    </p>
    <div class="flex items-center gap-2">
      <span class="text-muted-foreground">Página {{ page }} de {{ pages }}</span>
      <Button variant="outline" size="icon-sm" :disabled="page <= 1" aria-label="Página anterior" @click="page--">
        <ChevronLeft />
      </Button>
      <Button variant="outline" size="icon-sm" :disabled="page >= pages" aria-label="Próxima página" @click="page++">
        <ChevronRight />
      </Button>
    </div>
  </div>
</template>

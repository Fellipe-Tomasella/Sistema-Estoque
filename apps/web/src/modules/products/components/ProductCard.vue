<script setup lang="ts">
import { ChevronDown, Shirt } from '@lucide/vue'
import { ref } from 'vue'
import MoneyText from '@/components/common/MoneyText.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Product } from '../types'
import StockStatusBadge from './StockStatusBadge.vue'
import VariantActions from './VariantActions.vue'
import VariantGrid from './VariantGrid.vue'

/** Card do produto na lista: cabeçalho com preço e saldo; variações em tabela ou grade cor × tamanho. */
defineProps<{ product: Product; view: 'table' | 'grid' }>()
const open = ref(true)
</script>

<template>
  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <Collapsible v-model:open="open">
      <div class="flex items-center gap-3 p-4">
        <CollapsibleTrigger
          class="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          :aria-label="open ? 'Recolher variações' : 'Mostrar variações'"
        >
          <ChevronDown :class="cn('size-4 transition-transform', !open && '-rotate-90')" />
        </CollapsibleTrigger>
        <div
          class="hidden size-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex"
        >
          <Shirt class="size-5" />
        </div>
        <RouterLink :to="`/produtos/${product.id}`" class="min-w-0 flex-1 hover:underline">
          <p class="flex flex-wrap items-center gap-2 font-semibold">
            <span class="truncate">{{ product.name }}</span>
            <span v-if="product.reference" class="rounded bg-muted px-1.5 text-xs font-medium text-muted-foreground">
              Ref. {{ product.reference }}
            </span>
            <StatusBadge v-if="!product.active" tone="neutral">Inativo</StatusBadge>
          </p>
          <p class="truncate text-xs text-muted-foreground">
            {{ product.category ?? 'Sem categoria' }} · {{ product.variants.length }}
            {{ product.variants.length === 1 ? 'variação' : 'variações' }}
          </p>
        </RouterLink>
        <div class="hidden text-right sm:block">
          <p class="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Preço</p>
          <p class="font-semibold"><MoneyText :cents="product.basePriceCents" /></p>
        </div>
        <div class="text-right">
          <p class="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Saldo</p>
          <p :class="cn('font-semibold tabular', product.totalStock === 0 && 'text-red-700')">
            {{ product.totalStock }} un
          </p>
        </div>
      </div>

      <CollapsibleContent>
        <div v-if="view === 'grid'" class="border-t p-4">
          <VariantGrid :variants="product.variants" @select="$router.push(`/produtos/${product.id}`)" />
        </div>
        <Table v-else class="border-t">
          <TableHeader>
            <TableRow class="bg-muted/50">
              <TableHead>Variação</TableHead>
              <TableHead class="text-center">Situação</TableHead>
              <TableHead class="hidden text-right md:table-cell">Mínimo</TableHead>
              <TableHead class="text-right">Saldo</TableHead>
              <TableHead class="hidden text-right sm:table-cell">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="variant in product.variants" :key="variant.id">
              <TableCell>
                <p class="font-medium">{{ variant.label }}</p>
                <p class="text-xs text-muted-foreground">
                  <MoneyText :cents="variant.effectivePriceCents" />
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
              <TableCell class="hidden sm:table-cell"><VariantActions :variant-id="variant.id" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CollapsibleContent>
    </Collapsible>
  </Card>
</template>

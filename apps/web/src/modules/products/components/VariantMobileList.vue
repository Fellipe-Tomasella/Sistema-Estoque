<script setup lang="ts">
import { ArrowDownToLine, History, MoreVertical, Pencil, SlidersHorizontal, Trash2 } from '@lucide/vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Variant } from '../types'
import StockStatusBadge from './StockStatusBadge.vue'

/**
 * Variações no celular (no lugar da tabela, que não cabe): uma linha por variação com saldo e um menu com
 * entrada, acerto, histórico e, quando permitido, editar e excluir.
 */
const props = defineProps<{ variants: Variant[]; editable?: boolean }>()
const emit = defineEmits<{ edit: [variant: Variant]; remove: [variant: Variant] }>()
</script>

<template>
  <ul class="divide-y">
    <li v-for="variant in props.variants" :key="variant.id" class="flex items-center gap-3 px-4 py-3">
      <div class="min-w-0 flex-1">
        <p class="font-medium">{{ variant.label }}</p>
        <p class="truncate text-xs text-muted-foreground">
          <MoneyText :cents="variant.effectivePriceCents" /><template v-if="variant.sku"> · {{ variant.sku }}</template>
        </p>
        <StockStatusBadge :status="variant.stockStatus" :active="variant.active" class="mt-1" />
      </div>
      <p :class="cn('shrink-0 text-right font-semibold tabular', variant.stockStatus === 'out' && 'text-red-700')">
        {{ variant.stockQty }} un
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="shrink-0" :aria-label="`Ações de ${variant.label}`">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuItem as-child>
            <RouterLink :to="`/estoque/entradas/nova?variacao=${variant.id}`"><ArrowDownToLine /> Entrada</RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink :to="`/estoque/acertos/novo?variacao=${variant.id}`"><SlidersHorizontal /> Acerto</RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink :to="`/estoque/movimentos?variacao=${variant.id}`"><History /> Histórico</RouterLink>
          </DropdownMenuItem>
          <template v-if="editable">
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="emit('edit', variant)"><Pencil /> Editar</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" @select="emit('remove', variant)"
              ><Trash2 /> Excluir</DropdownMenuItem
            >
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  </ul>
</template>

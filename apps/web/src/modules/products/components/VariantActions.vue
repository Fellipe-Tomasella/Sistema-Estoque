<script setup lang="ts">
import { ArrowDownToLine, History, SlidersHorizontal } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Ações rápidas de uma variação: entrada, acerto e histórico (cada uma é uma tela própria). */
defineProps<{ variantId: string }>()
</script>

<template>
  <div class="flex items-center justify-end gap-1">
    <Button variant="secondary" size="sm" as-child>
      <RouterLink :to="`/estoque/entradas/nova?variacao=${variantId}`">
        <ArrowDownToLine /> <span class="hidden lg:inline">Entrada</span>
      </RouterLink>
    </Button>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="icon-sm" as-child aria-label="Acerto de estoque">
          <RouterLink :to="`/estoque/acertos/novo?variacao=${variantId}`"><SlidersHorizontal /></RouterLink>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Acerto de estoque</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="icon-sm" as-child aria-label="Histórico">
          <RouterLink :to="`/estoque/movimentos?variacao=${variantId}`"><History /></RouterLink>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Histórico de movimentos</TooltipContent>
    </Tooltip>
  </div>
</template>

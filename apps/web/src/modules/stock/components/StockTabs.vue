<script setup lang="ts">
import { ArrowDownToLine, Barcode, History, Package, Palette } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'

/**
 * Abas da área “Produtos e estoque”: cada aba é uma rota (o layout não recarrega). No celular as cinco cabem
 * lado a lado (ícone em cima, nome curto embaixo), sem precisar arrastar.
 */
const route = useRoute()
const tabs = [
  { to: '/produtos', label: 'Produtos', short: 'Produtos', icon: Package },
  { to: '/estoque/entradas', label: 'Entradas', short: 'Entradas', icon: ArrowDownToLine },
  { to: '/estoque/movimentos', label: 'Movimentos', short: 'Histórico', icon: History },
  { to: '/estoque/codigos', label: 'Códigos e etiquetas', short: 'Códigos', icon: Barcode },
  { to: '/estoque/opcoes', label: 'Cores e tamanhos', short: 'Opções', icon: Palette },
]
</script>

<template>
  <nav class="mb-6 grid grid-cols-5 gap-1 rounded-lg bg-muted p-1 sm:inline-flex sm:gap-0">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :class="
        cn(
          'flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm',
          route.path === tab.to && 'bg-card text-foreground shadow-sm',
        )
      "
    >
      <component :is="tab.icon" class="size-4" />
      <span class="sm:hidden">{{ tab.short }}</span>
      <span class="hidden sm:inline">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

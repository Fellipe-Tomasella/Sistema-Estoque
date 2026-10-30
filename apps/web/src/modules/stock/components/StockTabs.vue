<script setup lang="ts">
import { ArrowDownToLine, History, Package } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'

/** Abas da área “Produtos e estoque”: cada aba é uma rota (o layout não recarrega). */
const route = useRoute()
const tabs = [
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/estoque/entradas', label: 'Entradas', icon: ArrowDownToLine },
  { to: '/estoque/movimentos', label: 'Movimentos', icon: History },
]
</script>

<template>
  <nav class="mb-6 inline-flex rounded-lg bg-muted p-1">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :class="
        cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
          route.path === tab.to && 'bg-card text-foreground shadow-sm',
        )
      "
    >
      <component :is="tab.icon" class="size-4" /> {{ tab.label }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'

/** Abas da área de relatórios (06 §Relatórios). */
const route = useRoute()
const tabs = [
  { to: '/relatorios/vendas', label: 'Vendas' },
  { to: '/relatorios/fiado', label: 'Fiado em aberto' },
  { to: '/relatorios/mais-vendidos', label: 'Mais e menos vendidos' },
  { to: '/fechamento', label: 'Fechamento do dia' },
]
</script>

<template>
  <nav class="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b">
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      :class="
        cn(
          '-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
          route.path.startsWith(t.to)
            ? 'border-brand text-brand'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )
      "
    >
      {{ t.label }}
    </RouterLink>
  </nav>
</template>

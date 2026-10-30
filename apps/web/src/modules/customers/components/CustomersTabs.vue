<script setup lang="ts">
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'

/** Abas da área “Clientes e fiado” (cada aba é uma rota). */
const route = useRoute()
const tabs = [
  { to: '/fiado', label: 'Fiado em aberto' },
  { to: '/clientes', label: 'Todas as clientes' },
]
</script>

<template>
  <nav class="mb-6 flex gap-6 border-b">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :class="
        cn(
          '-mb-px border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
          route.path === tab.to && 'border-brand text-brand hover:text-brand',
        )
      "
    >
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>

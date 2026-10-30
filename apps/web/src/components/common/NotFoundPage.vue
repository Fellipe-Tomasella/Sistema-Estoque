<script setup lang="ts">
import { SearchX } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import EmptyState from './EmptyState.vue'
</script>

<template>
  <main class="flex min-h-svh items-center justify-center bg-background p-4">
    <EmptyState
      :icon="SearchX"
      title="Página não encontrada"
      description="O endereço não existe ou foi digitado errado."
    >
      <Button as-child><RouterLink to="/">Voltar ao início</RouterLink></Button>
    </EmptyState>
  </main>
</template>

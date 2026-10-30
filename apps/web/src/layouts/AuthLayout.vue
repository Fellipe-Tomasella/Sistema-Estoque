<script setup lang="ts">
import { Shirt } from '@lucide/vue'
</script>

<template>
  <main class="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
    <div class="mb-6 flex items-center gap-3">
      <div class="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Shirt class="size-5" />
      </div>
      <div class="leading-tight">
        <p class="font-semibold">Estoque</p>
        <p class="text-xs text-muted-foreground">Painel de gestão</p>
      </div>
    </div>
    <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
      <RouterView />
    </div>
  </main>
</template>

<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'
import { Inbox } from '@lucide/vue'

withDefaults(defineProps<{ title: string; description?: string; icon?: LucideIcon }>(), { icon: () => Inbox })
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
    <div class="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <component :is="icon" class="size-5" />
    </div>
    <p class="font-medium">{{ title }}</p>
    <p v-if="description" class="max-w-sm text-sm text-muted-foreground">{{ description }}</p>
    <div v-if="$slots.default" class="mt-2"><slot /></div>
  </div>
</template>

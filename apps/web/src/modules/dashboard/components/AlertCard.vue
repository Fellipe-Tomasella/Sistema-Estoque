<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'
import { ArrowRight } from '@lucide/vue'
import StatusBadge, { type Tone } from '@/components/common/StatusBadge.vue'
import { Card } from '@/components/ui/card'

defineProps<{
  count: number
  title: string
  description: string
  tag: string
  tone: Tone
  icon: LucideIcon
  to: string
  linkLabel?: string
}>()
</script>

<template>
  <Card class="flex flex-col gap-0 p-5 shadow-sm">
    <div class="flex items-start justify-between">
      <StatusBadge :tone="count > 0 ? tone : 'neutral'">{{ tag }}</StatusBadge>
      <component :is="icon" class="size-5 text-muted-foreground" />
    </div>
    <p class="mt-3 text-3xl font-semibold tabular">{{ count }}</p>
    <p class="mt-1 font-semibold">{{ title }}</p>
    <p class="mt-1 flex-1 text-sm text-muted-foreground">{{ description }}</p>
    <RouterLink :to="to" class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
      {{ linkLabel ?? 'Ver lista' }} <ArrowRight class="size-4" />
    </RouterLink>
  </Card>
</template>

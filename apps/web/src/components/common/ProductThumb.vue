<script setup lang="ts">
import { Shirt } from '@lucide/vue'
import { cn } from '@/lib/utils'

/** Miniatura do produto (capa ou foto da cor); sem foto, o ícone de peça. */
const props = defineProps<{ src: string | null | undefined; class?: string }>()
</script>

<template>
  <div
    :class="
      cn(
        'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground',
        props.class,
      )
    "
  >
    <img v-if="src" :src="src" alt="" class="size-full object-cover" loading="lazy" />
    <Shirt v-else class="size-1/2 max-h-5 max-w-5" />
  </div>
</template>

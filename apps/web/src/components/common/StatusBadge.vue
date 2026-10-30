<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Cores de estado do DESIGN.md — sempre com texto, nunca só cor. */
export type Tone = 'critical' | 'warning' | 'success' | 'neutral' | 'info'

const props = withDefaults(defineProps<{ tone?: Tone; class?: string }>(), { tone: 'neutral' })

const tones: Record<Tone, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
  warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  success:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  info: 'bg-brand-soft text-brand border-indigo-200 dark:border-indigo-900',
}
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md border px-2 text-[11px] font-medium',
        tones[props.tone],
        props.class,
      )
    "
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { Download } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Período do relatório: atalhos + datas livres, e o botão de CSV com os mesmos filtros. */
const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })
defineProps<{ presets: { label: string; from: string; to: string }[]; max: string; csv?: string }>()
</script>

<template>
  <div class="mb-4 flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
    <div class="flex flex-wrap gap-1">
      <button
        v-for="p in presets"
        :key="p.label"
        type="button"
        :class="
          cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            p.from === from && p.to === to ? 'bg-brand text-brand-foreground' : 'bg-muted hover:bg-muted/70',
          )
        "
        @click="((from = p.from), (to = p.to))"
      >
        {{ p.label }}
      </button>
    </div>
    <div class="flex items-center gap-2">
      <Input v-model="from" type="date" :max="to" class="w-40" aria-label="De" />
      <span class="text-sm text-muted-foreground">até</span>
      <Input v-model="to" type="date" :min="from" :max="max" class="w-40" aria-label="Até" />
    </div>
    <Button v-if="csv" variant="outline" class="lg:ml-auto" as-child>
      <a :href="csv"><Download /> Exportar CSV</a>
    </Button>
  </div>
</template>

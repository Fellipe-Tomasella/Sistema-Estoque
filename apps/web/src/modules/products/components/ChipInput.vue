<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'

/** Seleção por chips: sugestões para marcar/desmarcar e campo para incluir um valor novo. */
const selected = defineModel<string[]>({ required: true })
const props = defineProps<{
  suggestions: string[]
  placeholder: string
  presets?: { label: string; values: string[] }[]
}>()

const draft = ref('')
const key = (value: string) => value.trim().toLowerCase()
const options = computed(() => {
  const all = [...selected.value]
  for (const s of props.suggestions) if (!all.some((v) => key(v) === key(s))) all.push(s)
  return all
})
const isOn = (value: string) => selected.value.some((v) => key(v) === key(value))

function toggle(value: string) {
  selected.value = isOn(value) ? selected.value.filter((v) => key(v) !== key(value)) : [...selected.value, value]
}
function add() {
  const value = draft.value.trim().replace(/\s+/g, ' ')
  if (value && !isOn(value)) selected.value = [...selected.value, value]
  draft.value = ''
}
function applyPreset(values: string[]) {
  selected.value = [...selected.value, ...values.filter((v) => !isOn(v))]
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="presets?.length" class="flex flex-wrap items-center gap-1.5 text-xs">
      <span class="text-muted-foreground">Atalhos:</span>
      <button
        v-for="preset in presets"
        :key="preset.label"
        type="button"
        class="rounded-md bg-brand-soft px-2 py-1 font-medium text-brand hover:bg-brand/10"
        @click="applyPreset(preset.values)"
      >
        {{ preset.label }}
      </button>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="option in options"
        :key="option"
        type="button"
        :class="
          cn(
            'inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm font-medium transition-colors',
            isOn(option) ? 'border-brand bg-brand text-brand-foreground' : 'bg-card hover:bg-muted',
          )
        "
        :aria-pressed="isOn(option)"
        @click="toggle(option)"
      >
        {{ option }}
        <X v-if="isOn(option)" class="size-3.5" />
        <Plus v-else class="size-3.5 text-muted-foreground" />
      </button>
      <input
        v-model="draft"
        :placeholder="placeholder"
        class="h-8 w-36 rounded-md border border-dashed bg-transparent px-2.5 text-sm outline-none focus:border-brand"
        @keydown.enter.prevent="add"
        @blur="add"
      />
    </div>
  </div>
</template>

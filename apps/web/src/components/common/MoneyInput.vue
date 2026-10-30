<script setup lang="ts">
import { formatBRL } from '@estoque/shared'
import { ref, watch } from 'vue'
import { cn } from '@/lib/utils'

/**
 * Campo de dinheiro (DESIGN.md): prefixo “R$” fixo, digita só números e o valor se forma da direita
 * (como na maquininha). O modelo é em centavos; `null` = vazio (campo opcional).
 */
const model = defineModel<number | null | undefined>()
const props = defineProps<{ id?: string; placeholder?: string; class?: string; disabled?: boolean }>()

const toText = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? '' : formatBRL(cents).replace(/^R\$\s*/, '')
const text = ref(toText(model.value))

watch(model, (cents) => {
  if (toText(cents) !== text.value) text.value = toText(cents)
})

function onInput(event: Event) {
  const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  const cents = digits ? Math.min(Number(digits), 100_000_000) : null
  model.value = cents
  text.value = toText(cents)
  ;(event.target as HTMLInputElement).value = text.value
}
</script>

<template>
  <div
    :class="
      cn(
        'flex h-9 items-center rounded-md border border-input bg-card text-sm shadow-xs focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
        props.disabled && 'opacity-50',
        props.class,
      )
    "
  >
    <span class="border-r px-2.5 text-muted-foreground">R$</span>
    <input
      :id="props.id"
      :value="text"
      inputmode="numeric"
      :placeholder="props.placeholder ?? '0,00'"
      :disabled="props.disabled"
      class="h-full w-full min-w-0 bg-transparent px-2.5 text-right tabular outline-none placeholder:text-muted-foreground"
      @input="onInput"
    />
  </div>
</template>

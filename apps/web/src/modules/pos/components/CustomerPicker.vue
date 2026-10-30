<script setup lang="ts">
import { CircleCheck, Search, UserPlus, UserRound } from '@lucide/vue'
import { onClickOutside, refDebounced } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'
import MoneyText from '@/components/common/MoneyText.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CustomerFormDialog from '@/modules/customers/components/CustomerFormDialog.vue'
import { type Customer, useCustomer, useCustomerList } from '@/modules/customers/composables/useCustomers'

/** Cliente da venda: opcional à vista, obrigatória no fiado (RN-VEN-05). Cadastro rápido sem sair do PDV. */
const model = defineModel<string | null>({ required: true })
const emit = defineEmits<{ chosen: [customer: Customer] }>()

const term = ref('')
const debounced = refDebounced(term, 200)
const open = ref(false)
const creating = ref(false)
const root = useTemplateRef<HTMLElement>('root')
onClickOutside(root, () => (open.value = false))

const { data: selected } = useCustomer(() => model.value ?? '')
const { data: results } = useCustomerList(() => ({ q: debounced.value || undefined, pageSize: 8 }))

function choose(customer: Customer) {
  model.value = customer.id
  emit('chosen', customer)
  term.value = ''
  open.value = false
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <p class="flex items-center gap-2 text-sm font-medium"><UserRound class="size-4" /> Cliente</p>
      <button
        type="button"
        class="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        @click="creating = true"
      >
        <UserPlus class="size-3.5" /> Nova cliente
      </button>
    </div>

    <div v-if="model && selected" class="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <CircleCheck class="size-4 shrink-0 text-emerald-600" />
      <div class="min-w-0 flex-1">
        <p class="truncate font-medium">{{ selected.name }}</p>
        <p class="text-xs text-muted-foreground">
          {{ selected.phone ?? 'sem telefone' }}
          <template v-if="selected.openBalanceCents > 0">
            · deve <MoneyText :cents="selected.openBalanceCents" />
          </template>
        </p>
      </div>
      <Button variant="ghost" size="sm" @click="model = null">Trocar</Button>
    </div>

    <div v-else ref="root" class="relative">
      <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="term" placeholder="Buscar por nome ou telefone" class="pl-9" @focus="open = true" />
      <ul
        v-if="open"
        class="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
      >
        <li v-if="!results?.items.length" class="px-3 py-3 text-center text-sm text-muted-foreground">
          Nenhuma cliente encontrada.
          <button type="button" class="font-medium text-brand hover:underline" @mousedown.prevent="creating = true">
            Cadastrar
          </button>
        </li>
        <li
          v-for="c in results?.items ?? []"
          :key="c.id"
          class="cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-muted"
          @mousedown.prevent="choose(c)"
        >
          <span class="font-medium">{{ c.name }}</span>
          <span class="ml-2 text-xs text-muted-foreground">{{ c.phone }}</span>
        </li>
      </ul>
    </div>
    <p v-if="!model" class="text-xs text-muted-foreground">Opcional à vista; obrigatória para fiado.</p>

    <CustomerFormDialog v-model:open="creating" @saved="choose" />
  </div>
</template>

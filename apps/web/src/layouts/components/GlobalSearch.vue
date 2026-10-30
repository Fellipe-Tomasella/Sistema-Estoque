<script setup lang="ts">
import { LoaderCircle, Package, ReceiptText, Search, User } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { onKeyStroke, refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { client, unwrap } from '@/lib/api'
import { formatBRL } from '@/lib/format'

/** Busca global (Ctrl+K): produto, cliente ou venda pelo número. A filtragem é feita pela API. */
const open = defineModel<boolean>('open', { default: false })
const router = useRouter()
const term = ref('')
const debounced = refDebounced(term, 250)
const enabled = computed(() => open.value && debounced.value.trim().length >= 2)
const saleNumber = computed(() =>
  /^#?\d+$/.test(debounced.value.trim()) ? Number(debounced.value.replace(/\D/g, '')) : null,
)

onKeyStroke(['k', 'K'], (event) => {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  open.value = true
})
watch(open, (isOpen) => !isOpen && (term.value = ''))

const variants = useQuery({
  queryKey: ['search', 'variants', debounced],
  queryFn: () => unwrap(client.variants.search.get({ query: { q: debounced.value, limit: 6 } })),
  enabled,
})
const customers = useQuery({
  queryKey: ['search', 'customers', debounced],
  queryFn: () => unwrap(client.customers.get({ query: { q: debounced.value, pageSize: 5 } })),
  enabled,
})
const loading = computed(() => variants.isFetching.value || customers.isFetching.value)
const empty = computed(
  () =>
    enabled.value &&
    !loading.value &&
    !saleNumber.value &&
    !variants.data.value?.length &&
    !customers.data.value?.items.length,
)

function go(path: string) {
  open.value = false
  router.push(path)
}

const row =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none'
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" :show-close-button="false">
      <DialogTitle class="sr-only">Buscar</DialogTitle>
      <DialogDescription class="sr-only">Buscar produto, cliente ou venda pelo número</DialogDescription>
      <div class="flex items-center gap-2 border-b px-3">
        <Search class="size-4 text-muted-foreground" />
        <input
          v-model="term"
          autofocus
          class="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Buscar produto, cliente ou venda #..."
        />
        <LoaderCircle v-if="loading" class="size-4 animate-spin text-muted-foreground" />
      </div>

      <div class="max-h-[60vh] overflow-y-auto p-2">
        <p v-if="!enabled" class="px-3 py-6 text-center text-sm text-muted-foreground">
          Digite pelo menos 2 letras, ou o número da venda.
        </p>
        <p v-else-if="empty" class="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>

        <template v-if="enabled && saleNumber">
          <p class="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Venda</p>
          <button type="button" :class="row" @click="go(`/vendas?numero=${saleNumber}`)">
            <ReceiptText class="size-4 text-muted-foreground" /> Venda #{{ String(saleNumber).padStart(6, '0') }}
          </button>
        </template>

        <template v-if="enabled && variants.data.value?.length">
          <p class="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Produtos</p>
          <button
            v-for="v in variants.data.value"
            :key="v.id"
            type="button"
            :class="row"
            @click="go(`/produtos/${v.productId}`)"
          >
            <Package class="size-4 shrink-0 text-muted-foreground" />
            <span class="flex-1 truncate">{{ v.productName }} · {{ v.label }}</span>
            <span class="tabular text-xs text-muted-foreground">
              {{ formatBRL(v.effectivePriceCents) }} · {{ v.stockQty }} un
            </span>
          </button>
        </template>

        <template v-if="enabled && customers.data.value?.items.length">
          <p class="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Clientes</p>
          <button
            v-for="c in customers.data.value.items"
            :key="c.id"
            type="button"
            :class="row"
            @click="go(`/clientes/${c.id}`)"
          >
            <User class="size-4 shrink-0 text-muted-foreground" /> {{ c.label }}
          </button>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>

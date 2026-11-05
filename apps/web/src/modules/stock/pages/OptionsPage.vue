<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { client, unwrap } from '@/lib/api'
import { queryClient } from '@/lib/query'
import { cn } from '@/lib/utils'
import StockTabs from '../components/StockTabs.vue'

/**
 * Aba Opções (RN-PRO-17): as cores, tamanhos e categorias que aparecem nas sugestões dos cadastros. Renomear corrige
 * o nome em todas as peças; excluir tira da lista, e só é permitido quando nenhuma peça ativa usa a opção.
 */
type Kind = 'color' | 'size' | 'category'
type Options = Awaited<ReturnType<typeof load>>
type Option = Options['colors'][number]

const load = () => unwrap(client.products.options.get())
const { data, isPending } = useQuery({ queryKey: ['products', 'options'], queryFn: load })

const kinds = [
  { kind: 'color', key: 'colors', label: 'Cores', one: 'cor' },
  { kind: 'size', key: 'sizes', label: 'Tamanhos', one: 'tamanho' },
  { kind: 'category', key: 'categories', label: 'Categorias', one: 'categoria' },
] as const
const tab = ref<Kind>('color')
const current = computed(() => kinds.find((k) => k.kind === tab.value)!)
const items = computed<Option[]>(() => data.value?.[current.value.key] ?? [])
const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? items.value.filter((o) => o.value.toLowerCase().includes(q)) : items.value
})

// tudo que mostra cor/tamanho/categoria (produtos, sugestões, PDV) precisa recarregar
const done = (options: Options, message: string) => {
  queryClient.setQueryData(['products', 'options'], options)
  queryClient.invalidateQueries({ queryKey: ['products'] })
  queryClient.invalidateQueries({ queryKey: ['variants'] })
  toast.success(message)
}

const renaming = ref<Option | null>(null)
const newName = ref('')
const rename = useMutation({
  mutationFn: (v: { kind: Kind; from: string; to: string }) =>
    unwrap(client.products.options({ kind: v.kind }).put({ from: v.from, to: v.to })),
  onSuccess: (options, v) => {
    done(options, `“${v.from}” agora é “${v.to.trim()}” em todas as peças.`)
    renaming.value = null
  },
})
function openRename(option: Option) {
  renaming.value = option
  newName.value = option.value
}
function submitRename() {
  if (!renaming.value || !newName.value.trim()) return
  rename.mutate({ kind: tab.value, from: renaming.value.value, to: newName.value })
}

const removing = ref<Option | null>(null)
const remove = useMutation({
  mutationFn: (v: { kind: Kind; value: string }) =>
    unwrap(client.products.options({ kind: v.kind }).delete({}, { query: { value: v.value } })),
  onSuccess: (options, v) => {
    done(options, `“${v.value}” saiu da lista.`)
    removing.value = null
  },
})

const usage = (o: Option) => {
  const what = tab.value === 'category' ? ['produto ativo', 'produtos ativos'] : ['peça ativa', 'peças ativas']
  if (o.activeCount) return `${o.activeCount} ${o.activeCount === 1 ? what[0] : what[1]}`
  return o.inactiveCount ? 'Só em peças inativas' : 'Sem uso'
}
</script>

<template>
  <PageHeader title="Produtos e estoque" description="Corrija ou exclua cores, tamanhos e categorias." />
  <StockTabs />

  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
    <nav class="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:inline-flex">
      <button
        v-for="k in kinds"
        :key="k.kind"
        type="button"
        :class="
          cn(
            'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
            tab === k.kind && 'bg-card text-foreground shadow-sm',
          )
        "
        @click="tab = k.kind"
      >
        {{ k.label }} <span class="text-xs opacity-70">{{ data?.[k.key].length ?? '' }}</span>
      </button>
    </nav>
    <Input v-model="search" :placeholder="`Buscar ${current.one}`" class="sm:ml-auto sm:w-60" />
  </div>

  <p class="mb-3 text-sm text-muted-foreground">
    Só dá para excluir o que nenhuma peça ativa usa. Para tirar uma {{ current.one }} em uso, troque ou inative as peças
    antes — ou renomeie para juntar com a certa.
  </p>

  <Card class="gap-0 overflow-hidden p-0 shadow-sm">
    <Skeleton v-if="isPending" class="m-4 h-40" />
    <EmptyState v-else-if="!filtered.length" :title="`Nenhuma ${current.one} encontrada`" />
    <ul v-else class="divide-y">
      <li v-for="o in filtered" :key="o.value" class="flex items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">{{ o.value }}</p>
          <p class="truncate text-xs text-muted-foreground">
            {{ usage(o) }}<template v-if="o.products.length"> · {{ o.products.join(', ') }}</template>
          </p>
        </div>
        <Button variant="ghost" size="icon" :aria-label="`Renomear ${o.value}`" @click="openRename(o)">
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-destructive hover:text-destructive"
          :disabled="o.activeCount > 0"
          :title="o.activeCount > 0 ? `Em uso: ${usage(o)}` : 'Excluir da lista'"
          :aria-label="`Excluir ${o.value}`"
          @click="removing = o"
        >
          <Trash2 />
        </Button>
      </li>
    </ul>
  </Card>

  <Dialog :open="!!renaming" @update:open="(v) => !v && (renaming = null)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Renomear {{ current.one }}</DialogTitle>
        <DialogDescription>
          Troca “{{ renaming?.value }}” em todas as peças ({{ renaming && usage(renaming) }}). Vendas antigas mantêm o
          nome antigo.
        </DialogDescription>
      </DialogHeader>
      <form id="rename-option" @submit.prevent="submitRename">
        <Input v-model="newName" maxlength="60" autofocus aria-label="Novo nome" />
      </form>
      <DialogFooter class="gap-2">
        <Button variant="outline" @click="renaming = null">Cancelar</Button>
        <Button type="submit" form="rename-option" :disabled="rename.isPending.value || !newName.trim()">
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog :open="!!removing" @update:open="(v) => !v && (removing = null)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Excluir “{{ removing?.value }}”?</DialogTitle>
        <DialogDescription>
          Sai da lista de opções e das sugestões. Nenhuma peça ativa usa
          {{ current.one === 'tamanho' ? 'este' : 'esta' }} {{ current.one }}; o histórico das peças inativas continua
          igual.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" @click="removing = null">Cancelar</Button>
        <Button
          variant="destructive"
          :disabled="remove.isPending.value"
          @click="removing && remove.mutate({ kind: tab, value: removing.value })"
        >
          Excluir
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

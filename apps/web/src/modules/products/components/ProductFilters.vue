<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProductSuggestions } from '../composables/useProducts'
import { ALL } from '../filters'

/** Filtros da lista (RN-PRO-10). */

const q = defineModel<string>('q', { required: true })
const color = defineModel<string>('color', { required: true })
const size = defineModel<string>('size', { required: true })
const category = defineModel<string>('category', { required: true })
const stock = defineModel<string>('stock', { required: true })
const status = defineModel<string>('status', { required: true })

const { data: suggestions } = useProductSuggestions()

function clear() {
  q.value = ''
  color.value = size.value = category.value = stock.value = ALL
  status.value = 'ativos'
}
</script>

<template>
  <div class="mb-4 flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
    <div class="relative flex-1">
      <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="q" placeholder="Buscar por nome…" class="pl-9" />
    </div>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
      <Select v-model="color">
        <SelectTrigger class="w-full lg:w-36"><SelectValue placeholder="Cor" /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Cor: todas</SelectItem>
          <SelectItem v-for="c in suggestions?.colors" :key="c" :value="c">{{ c }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="size">
        <SelectTrigger class="w-full lg:w-36"><SelectValue placeholder="Tamanho" /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Tamanho: todos</SelectItem>
          <SelectItem v-for="s in suggestions?.sizes" :key="s" :value="s">{{ s }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="category">
        <SelectTrigger class="w-full lg:w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Categoria: todas</SelectItem>
          <SelectItem v-for="c in suggestions?.categories" :key="c" :value="c">{{ c }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="stock">
        <SelectTrigger class="w-full lg:w-40"><SelectValue placeholder="Estoque" /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Estoque: todos</SelectItem>
          <SelectItem value="sem">Sem estoque</SelectItem>
          <SelectItem value="repor">Repor</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="status">
        <SelectTrigger class="w-full lg:w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ativos">Ativos</SelectItem>
          <SelectItem value="inativos">Inativos</SelectItem>
          <SelectItem :value="ALL">Ativos e inativos</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" class="text-brand" @click="clear"><X /> Limpar</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Shirt } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/modules/dashboard/composables/useDashboard'
import { isActive, navItems } from '../navigation'

defineProps<{ storeName: string }>()
const emit = defineEmits<{ navigate: [] }>()

const route = useRoute()
const { pendingCount } = useDashboard()
</script>

<template>
  <nav class="flex h-full flex-col gap-1 bg-sidebar px-3 py-4">
    <RouterLink to="/" class="mb-6 flex items-center gap-3 px-2" @click="emit('navigate')">
      <div class="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Shirt class="size-5" />
      </div>
      <div class="min-w-0 leading-tight">
        <p class="truncate font-semibold">{{ storeName }}</p>
        <p class="text-xs text-muted-foreground">Painel de gestão</p>
      </div>
    </RouterLink>

    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      :class="
        cn(
          'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          isActive(item, route.path) && 'bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand',
        )
      "
      @click="emit('navigate')"
    >
      <component :is="item.icon" class="size-[18px] shrink-0" />
      <span class="flex-1 truncate">{{ item.label }}</span>
      <span
        v-if="item.badge === 'pending' && pendingCount > 0"
        class="flex h-5 min-w-5 items-center justify-center rounded-md bg-red-100 px-1.5 text-[11px] font-semibold text-red-700"
      >
        {{ pendingCount }}
      </span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { Menu } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'
import { isActive, mobileTabs } from '../navigation'

const emit = defineEmits<{ more: [] }>()
const route = useRoute()
const tab = 'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium min-h-14'
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
  >
    <RouterLink
      v-for="item in mobileTabs"
      :key="item.to"
      :to="item.to"
      :class="cn(tab, isActive(item, route.path) ? 'text-brand' : 'text-muted-foreground')"
    >
      <span
        v-if="item.primary"
        class="flex size-10 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-sm"
      >
        <component :is="item.icon" class="size-5" />
      </span>
      <component :is="item.icon" v-else class="size-5" />
      <span>{{ item.label }}</span>
    </RouterLink>
    <button type="button" :class="cn(tab, 'text-muted-foreground')" @click="emit('more')">
      <Menu class="size-5" />
      <span>Mais</span>
    </button>
  </nav>
</template>

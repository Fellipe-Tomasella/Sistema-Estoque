<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import OfflineBanner from '@/components/common/OfflineBanner.vue'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { client, unwrap } from '@/lib/api'
import { keys } from '@/lib/query'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import GlobalSearch from './components/GlobalSearch.vue'
import MobileTabBar from './components/MobileTabBar.vue'

/**
 * Layout persistente: barra lateral (desktop), cabeçalho e barra inferior (celular) são montados uma vez;
 * as telas trocam só dentro do <RouterView>.
 */
const route = useRoute()
const drawerOpen = ref(false)
const searchOpen = ref(false)

const settings = useQuery({ queryKey: keys.settings, queryFn: () => unwrap(client.settings.store.get()) })
const storeName = computed(() => settings.data.value?.storeName ?? 'Minha loja')

watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
)
</script>

<template>
  <div class="min-h-svh bg-background">
    <aside class="fixed inset-y-0 left-0 z-40 hidden w-60 border-r lg:block">
      <AppSidebar :store-name="storeName" />
    </aside>

    <Sheet v-model:open="drawerOpen">
      <SheetContent side="left" class="w-72 p-0">
        <SheetTitle class="sr-only">Menu</SheetTitle>
        <SheetDescription class="sr-only">Navegação do sistema</SheetDescription>
        <AppSidebar :store-name="storeName" @navigate="drawerOpen = false" />
      </SheetContent>
    </Sheet>

    <div class="lg:pl-60">
      <OfflineBanner />
      <AppHeader @menu="drawerOpen = true" @search="searchOpen = true" />
      <!-- conteúdo ocupa a largura toda ao lado do menu (sem vão em monitor grande) -->
      <main class="w-full px-4 pt-6 pb-24 md:px-6 md:pb-10 xl:px-8 2xl:px-10">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>

    <MobileTabBar @more="drawerOpen = true" />
    <GlobalSearch v-model:open="searchOpen" />
  </div>
</template>

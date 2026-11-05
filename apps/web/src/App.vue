<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import UpdatePrompt from '@/components/common/UpdatePrompt.vue'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import 'vue-sonner/style.css'
const mobile = useMediaQuery('(max-width: 767px)')
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <RouterView />
  </TooltipProvider>
  <!-- avisos: no celular no topo e no meio, com letra maior (dá para ler de relance no balcão) -->
  <Toaster
    :position="mobile ? 'top-center' : 'top-right'"
    rich-colors
    close-button
    :toast-options="{ class: 'text-[15px] font-medium sm:text-sm', style: { padding: '14px 16px' } }"
  />
  <UpdatePrompt />
</template>

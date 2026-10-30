<script setup lang="ts">
import UpdatePrompt from '@/components/common/UpdatePrompt.vue'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import 'vue-sonner/style.css'
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <RouterView />
  </TooltipProvider>
  <Toaster position="top-right" rich-colors close-button />
  <UpdatePrompt />
</template>

<script setup lang="ts">
import { Hammer } from '@lucide/vue'
import { useRoute } from 'vue-router'
import EmptyState from './EmptyState.vue'

const route = useRoute()
</script>

<template>
  <EmptyState
    :icon="Hammer"
    :title="String(route.meta.title ?? 'Tela')"
    description="Esta tela está sendo construída e entra numa das próximas etapas."
  />
</template>

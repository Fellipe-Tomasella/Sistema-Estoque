<script setup lang="ts">
import type { StockStatus } from '@estoque/shared'
import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps<{ status: StockStatus; active?: boolean }>()
</script>

<template>
  <StatusBadge v-if="active === false" tone="neutral">Inativa</StatusBadge>
  <StatusBadge v-else-if="status === 'out'" tone="critical">Sem estoque</StatusBadge>
  <StatusBadge v-else-if="status === 'low'" tone="warning">Repor</StatusBadge>
  <StatusBadge v-else tone="success">Estoque ok</StatusBadge>
</template>

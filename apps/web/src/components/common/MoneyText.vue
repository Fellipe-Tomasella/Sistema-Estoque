<script setup lang="ts">
import { formatBRL } from '@/lib/format'

defineProps<{ cents: number }>()
</script>

<template>
  <span class="tabular whitespace-nowrap">{{ formatBRL(cents) }}</span>
</template>

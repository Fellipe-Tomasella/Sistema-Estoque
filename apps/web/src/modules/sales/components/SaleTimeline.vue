<script setup lang="ts">
import { History } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import type { SaleDetail } from '../composables/useSales'

/** Linha do tempo (RN-DEV-09): confirmação, pagamentos, envio, cancelamento, devoluções e notas. */
defineProps<{ events: SaleDetail['timeline'] }>()
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold"><History class="size-4 text-brand" /> Linha do tempo</h2>
    <ol class="relative space-y-4 border-l pl-5">
      <li v-for="(e, i) in events" :key="i" class="relative text-sm">
        <span class="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-brand" />
        <p>{{ e.description }}</p>
        <p class="text-xs text-muted-foreground">{{ formatDateTime(e.at) }}</p>
      </li>
    </ol>
  </Card>
</template>

<script setup lang="ts">
import { WifiOff } from '@lucide/vue'
import { useOnline } from '@vueuse/core'

/** 02 §3.8: sem conexão nada é salvo; o aviso fica no topo até a internet voltar. */
const online = useOnline()
</script>

<template>
  <div
    v-if="!online"
    role="alert"
    class="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"
  >
    <WifiOff class="size-4" />
    Sem internet — nada será salvo até a conexão voltar.
  </div>
</template>

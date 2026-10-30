<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { watch } from 'vue'
import { toast } from 'vue-sonner'

/** Nova versão publicada: avisa e atualiza quando a dona quiser (não recarrega no meio de uma venda). */
const { needRefresh, updateServiceWorker } = useRegisterSW()
watch(needRefresh, (value) => {
  if (!value) return
  toast.info('Nova versão do sistema disponível.', {
    duration: Infinity,
    action: { label: 'Atualizar', onClick: () => updateServiceWorker(true) },
  })
})
</script>

<template>
  <span hidden />
</template>

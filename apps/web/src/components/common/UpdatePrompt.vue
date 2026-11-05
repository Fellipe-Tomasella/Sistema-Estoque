<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'

/**
 * Nova versão publicada. Fora de uma venda, atualiza sozinho (no celular o aviso passava despercebido e o app
 * ficava na versão velha). No PDV ou numa venda em andamento, só avisa: atualiza quando a dona tocar ou sair dali.
 * Procura versão nova ao abrir o app, ao voltar para ele e a cada 30 minutos.
 */
const route = useRoute()
const inSale = () => route.path.startsWith('/pdv') || route.path.startsWith('/vender')

let registration: ServiceWorkerRegistration | undefined
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, r) {
    registration = r
    setInterval(() => r?.update(), 30 * 60 * 1000)
  },
})
useEventListener(document, 'visibilitychange', () => {
  if (document.visibilityState === 'visible') registration?.update()
})

let warned = false
function apply() {
  if (!needRefresh.value) return
  if (!inSale()) return updateServiceWorker(true)
  if (warned) return
  warned = true
  toast.info('Nova versão do sistema disponível.', {
    duration: Infinity,
    action: { label: 'Atualizar', onClick: () => updateServiceWorker(true) },
  })
}
watch(needRefresh, apply)
// saiu do PDV/da venda com atualização pendente: aplica
watch(() => route.path, apply)
</script>

<template>
  <span hidden />
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Skeleton } from '@/components/ui/skeleton'
import PdvWorkspace from '../components/PdvWorkspace.vue'
import { useDrafts } from '../composables/useSaleDraft'

/** /pdv cria um rascunho e entra; /pdv/:draftId é o PDV daquela venda. */
const route = useRoute()
const router = useRouter()
const draftId = computed(() => route.params.draftId as string | undefined)
const { create } = useDrafts()

// O flag segura até a troca de rota: entre criar e redirecionar, não pode criar outro.
let starting = false
watchEffect(async () => {
  if (draftId.value || starting) return
  starting = true
  try {
    const sale = await create.mutateAsync()
    await router.replace(`/pdv/${sale.id}`)
  } finally {
    starting = false
  }
})
</script>

<template>
  <PdvWorkspace v-if="draftId" :id="draftId" :key="draftId" />
  <div v-else class="grid min-h-svh gap-4 p-4 lg:grid-cols-[1fr_400px] lg:p-6">
    <Skeleton class="h-96" /><Skeleton class="h-96" />
  </div>
</template>

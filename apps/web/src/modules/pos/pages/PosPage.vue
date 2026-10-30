<script setup lang="ts">
import { FilePen, LoaderCircle, Plus, Trash2 } from '@lucide/vue'
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import SaleWorkspace from '../components/SaleWorkspace.vue'
import { useDrafts } from '../composables/useSaleDraft'

/**
 * /vender abre direto uma venda nova; se houver rascunhos (RN-VEN-09), mostra a lista para continuar
 * um deles. /vender/:draftId é o PDV daquele rascunho.
 */
const route = useRoute()
const router = useRouter()
const draftId = computed(() => route.params.draftId as string | undefined)
const { drafts, create, discard } = useDrafts()

// Fica ligado até a troca de rota: entre criar e redirecionar, não pode criar outra.
let starting = false
async function newSale() {
  if (starting) return
  starting = true
  try {
    const sale = await create.mutateAsync()
    await router.replace(`/vender/${sale.id}`)
  } finally {
    starting = false
  }
}

// Sem rascunhos (ou “Nova venda” da tela de sucesso): cria e entra direto.
watchEffect(() => {
  if (draftId.value || !drafts.data.value || starting) return
  if (route.query.nova || (!drafts.data.value.length && !route.query.lista)) newSale()
})
</script>

<template>
  <SaleWorkspace v-if="draftId" :id="draftId" :key="draftId" />

  <template v-else>
    <PageHeader title="Vender" description="Continue uma venda em aberto ou comece outra.">
      <template #actions>
        <Button
          class="bg-brand text-brand-foreground hover:bg-brand/90"
          :disabled="create.isPending.value"
          @click="newSale"
        >
          <LoaderCircle v-if="create.isPending.value" class="animate-spin" /><Plus v-else /> Nova venda
        </Button>
      </template>
    </PageHeader>

    <Card class="gap-0 overflow-hidden p-0 shadow-sm">
      <div v-if="drafts.isPending.value" class="space-y-2 p-4"><Skeleton v-for="i in 3" :key="i" class="h-12" /></div>
      <EmptyState
        v-else-if="!drafts.data.value?.length"
        :icon="FilePen"
        title="Nenhum rascunho"
        description="Vendas não confirmadas ficam guardadas aqui."
      />
      <div
        v-for="d in drafts.data.value ?? []"
        :key="d.id"
        class="flex items-center gap-3 border-b px-4 py-3 last:border-0"
      >
        <RouterLink :to="`/vender/${d.id}`" class="min-w-0 flex-1 hover:underline">
          <p class="font-medium">{{ d.customerName ?? 'Sem cliente' }}</p>
          <p class="text-xs text-muted-foreground">Alterado em {{ formatDateTime(d.updatedAt) }}</p>
        </RouterLink>
        <p class="font-semibold"><MoneyText :cents="d.totalCents" /></p>
        <Button size="sm" variant="secondary" as-child
          ><RouterLink :to="`/vender/${d.id}`">Continuar</RouterLink></Button
        >
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Descartar rascunho"
          :disabled="discard.isPending.value"
          @click="discard.mutate(d.id)"
        >
          <Trash2 class="text-muted-foreground" />
        </Button>
      </div>
    </Card>
  </template>
</template>

<script setup lang="ts">
import { useRouteQuery } from '@vueuse/router'
import EmptyState from '@/components/common/EmptyState.vue'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Card } from '@/components/ui/card'
import ReceivePanel from '../components/ReceivePanel.vue'
import { useOpenReceivables } from '../composables/useReceivables'

/** Receber fiado em tela própria (celular e atalho “Receber fiado” do Início). Sem cliente, escolhe na lista. */
const customerId = useRouteQuery<string | undefined>('cliente', undefined)
const { data } = useOpenReceivables()
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/fiado" class="hover:text-foreground">Fiado em aberto</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">Receber</span>
  </nav>
  <PageHeader title="Receber fiado" description="Pagamento total ou parcial. Não cria venda e não mexe no estoque." />

  <div class="mx-auto max-w-lg">
    <ReceivePanel v-if="customerId" :customer-id="customerId" @done="$router.push(`/clientes/${customerId}`)" />
    <Card v-else class="gap-0 overflow-hidden p-0 shadow-sm">
      <p class="px-4 py-3 text-sm font-medium">Quem está pagando?</p>
      <EmptyState v-if="!data?.customers.length" title="Ninguém devendo" />
      <button
        v-for="c in data?.customers"
        :key="c.customerId"
        type="button"
        class="flex w-full items-center justify-between border-t px-4 py-3 text-left hover:bg-muted/50"
        @click="customerId = c.customerId"
      >
        <span>
          <span class="block font-medium">{{ c.name }}</span>
          <span class="text-xs text-muted-foreground">{{ c.phone ?? 'sem telefone' }}</span>
        </span>
        <span class="font-semibold"><MoneyText :cents="c.openBalanceCents" /></span>
      </button>
    </Card>
  </div>
</template>

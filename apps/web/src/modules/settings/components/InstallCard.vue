<script setup lang="ts">
import { CircleCheck, Smartphone } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useInstall } from '@/lib/pwa'

/** Instalar no celular (06 §PWA): botão quando o navegador oferece; senão, o passo a passo. */
const { canPrompt, installed, isIos, install } = useInstall()

async function onInstall() {
  if (await install()) toast.success('Instalado! Procure o ícone “Estoque” na tela inicial.')
}
</script>

<template>
  <Card class="gap-3 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold"><Smartphone class="size-4 text-brand" /> Instalar no celular</h2>
    <p v-if="installed" class="flex items-center gap-2 text-sm text-emerald-700">
      <CircleCheck class="size-4" /> Você está usando o app instalado.
    </p>
    <template v-else>
      <p class="text-sm text-muted-foreground">
        Fica com ícone na tela inicial e abre em tela cheia. Precisa de internet para funcionar.
      </p>
      <Button v-if="canPrompt" class="bg-brand text-brand-foreground hover:bg-brand/90" @click="onInstall">
        <Smartphone /> Instalar agora
      </Button>
      <ol v-else-if="isIos" class="list-decimal space-y-1 pl-5 text-sm">
        <li>Abra este endereço no Safari.</li>
        <li>Toque em <strong>Compartilhar</strong> (quadrado com seta).</li>
        <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
      </ol>
      <ol v-else class="list-decimal space-y-1 pl-5 text-sm">
        <li>Abra este endereço no Chrome do celular.</li>
        <li>Toque no menu <strong>⋮</strong>.</li>
        <li>Escolha <strong>Instalar app</strong> (ou “Adicionar à tela inicial”).</li>
      </ol>
    </template>
  </Card>
</template>

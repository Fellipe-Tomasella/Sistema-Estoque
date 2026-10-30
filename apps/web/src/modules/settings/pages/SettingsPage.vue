<script setup lang="ts">
import { Download, HardDriveDownload } from '@lucide/vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import InstallCard from '../components/InstallCard.vue'
import SecurityCard from '../components/SecurityCard.vue'
import StoreSettingsCard from '../components/StoreSettingsCard.vue'

/** Configurações (06 §Configurações): loja, acesso, cópia dos dados e instalar no celular. */
</script>

<template>
  <PageHeader title="Configurações" description="Dados da loja, acesso e cópia de segurança." />
  <div class="grid gap-4 lg:grid-cols-[1fr_380px]">
    <StoreSettingsCard />
    <div class="space-y-4">
      <SecurityCard />
      <Card class="gap-3 p-5 shadow-sm">
        <h2 class="flex items-center gap-2 font-semibold">
          <HardDriveDownload class="size-4 text-brand" /> Seus dados
        </h2>
        <p class="text-sm text-muted-foreground">
          Baixe tudo (produtos, estoque, clientes, vendas, fiado) em planilhas CSV dentro de um arquivo ZIP.
        </p>
        <Button variant="outline" as-child>
          <a href="/api/exports/full.zip"><Download /> Baixar cópia dos dados</a>
        </Button>
      </Card>
      <InstallCard />
    </div>
  </div>
</template>

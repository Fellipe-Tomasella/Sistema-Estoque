<script setup lang="ts">
import { CircleAlert, CircleCheck, Download, FileSpreadsheet, LoaderCircle, Upload } from '@lucide/vue'
import { useMutation } from '@tanstack/vue-query'
import { useDropZone } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import MoneyText from '@/components/common/MoneyText.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { client, unwrap } from '@/lib/api'
import { invalidateStock } from '@/lib/query'
import { cn } from '@/lib/utils'

/** Importação da planilha inicial (RN-IMP): prévia sem gravar nada, erros por linha, depois efetivar uma vez. */
const router = useRouter()
const skipErrors = ref(false)
const dropZone = useTemplateRef<HTMLElement>('dropZone')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const preview = useMutation({
  mutationFn: (file: File) => unwrap(client.stock.import.preview.post({ file })),
  onSuccess: () => (skipErrors.value = false),
})
const commit = useMutation({
  mutationFn: () =>
    unwrap(
      client.stock.import({ batchId: preview.data.value!.batchId }).commit.post({ skipErrorRows: skipErrors.value }),
    ),
  onSuccess: async (result) => {
    await invalidateStock()
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
    toast.success(
      `Importação concluída: ${plural(result.productsCreated, 'produto novo', 'produtos novos')}, ` +
        `${plural(result.variantsCreated, 'variação', 'variações')} e ${plural(result.units, 'peça', 'peças')}.`,
    )
    router.push('/produtos')
  },
})
const discard = useMutation({
  mutationFn: () => unwrap(client.stock.import({ batchId: preview.data.value!.batchId }).discard.post()),
  onSuccess: () => preview.reset(),
})

function send(files: FileList | File[] | null) {
  const file = files?.[0]
  if (file) preview.mutate(file)
}
const { isOverDropZone } = useDropZone(dropZone, { onDrop: send, multiple: false })

const result = computed(() => preview.data.value)
const hasErrors = computed(() => (result.value?.errors.length ?? 0) > 0)
const canCommit = computed(
  () => result.value && result.value.summary.variants > 0 && (!hasErrors.value || skipErrors.value),
)
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/produtos" class="hover:text-foreground">Produtos e estoque</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">Importar planilha</span>
  </nav>
  <PageHeader
    title="Importar planilha"
    description="Cadastre o estoque inicial de uma vez, a partir de uma planilha .xlsx ou .csv."
  >
    <template #actions>
      <Button variant="outline" as-child>
        <a href="/api/stock/import/template" download><Download /> Baixar modelo</a>
      </Button>
    </template>
  </PageHeader>

  <Card v-if="!result" class="gap-4 p-5 shadow-sm">
    <div
      ref="dropZone"
      :class="
        cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors',
          isOverDropZone && 'border-brand bg-brand-soft',
        )
      "
    >
      <FileSpreadsheet class="size-10 text-muted-foreground" />
      <div>
        <p class="font-medium">Arraste a planilha aqui ou escolha o arquivo</p>
        <p class="text-sm text-muted-foreground">
          Colunas: produto, cor, tamanho, preço e quantidade (obrigatórias); alerta mínimo, referência, categoria e
          custo.
        </p>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.csv"
        class="hidden"
        @change="send(($event.target as HTMLInputElement).files)"
      />
      <Button :disabled="preview.isPending.value" @click="fileInput?.click()">
        <LoaderCircle v-if="preview.isPending.value" class="animate-spin" /><Upload v-else /> Escolher arquivo
      </Button>
      <p class="text-xs text-muted-foreground">Nada é gravado agora: primeiro você confere a prévia.</p>
    </div>
  </Card>

  <template v-else>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        v-for="(value, label) in {
          'Produtos novos': result.summary.productsToCreate,
          'Produtos que ganham variações': result.summary.productsToUpdate,
          Variações: result.summary.variants,
          Peças: result.summary.units,
        }"
        :key="label"
        class="gap-1 p-4 shadow-sm"
      >
        <p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">{{ label }}</p>
        <p class="text-2xl font-semibold tabular">{{ value }}</p>
      </Card>
    </div>

    <Tabs :default-value="hasErrors ? 'erros' : 'criar'" class="mt-6">
      <TabsList>
        <TabsTrigger value="criar"><CircleCheck /> Vai ser criado</TabsTrigger>
        <TabsTrigger value="erros">
          <CircleAlert /> Erros
          <StatusBadge v-if="hasErrors" tone="critical">{{ result.errors.length }}</StatusBadge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="criar" class="space-y-3">
        <Card v-for="group in result.groups" :key="group.name" class="gap-2 p-4 shadow-sm">
          <p class="flex flex-wrap items-center gap-2 font-semibold">
            {{ group.name }}
            <StatusBadge :tone="group.existingProductId ? 'info' : 'success'">
              {{ group.existingProductId ? 'Produto existente' : 'Novo' }}
            </StatusBadge>
            <span class="text-sm font-normal text-muted-foreground"
              >preço base <MoneyText :cents="group.basePriceCents"
            /></span>
          </p>
          <div class="flex flex-wrap gap-2 text-sm">
            <span v-for="v in group.variants" :key="v.line" class="rounded-md bg-muted px-2 py-1">
              {{ v.color }} / {{ v.size }} · <b>{{ v.quantity }}</b> un
              <template v-if="v.priceCents !== null"> · <MoneyText :cents="v.priceCents" /></template>
            </span>
          </div>
        </Card>
        <p v-if="!result.groups.length" class="py-6 text-center text-sm text-muted-foreground">Nenhuma linha válida.</p>
      </TabsContent>
      <TabsContent value="erros">
        <Card class="gap-0 p-0 shadow-sm">
          <p v-if="!hasErrors" class="p-6 text-center text-sm text-muted-foreground">Nenhum erro encontrado.</p>
          <div v-for="error in result.errors" :key="error.line" class="flex gap-3 border-b p-3 text-sm last:border-0">
            <span class="w-20 shrink-0 font-medium">Linha {{ error.line }}</span>
            <span class="text-red-700">{{ error.message }}</span>
          </div>
        </Card>
      </TabsContent>
    </Tabs>

    <Card class="mt-6 flex-row flex-wrap items-center gap-4 p-4 shadow-sm">
      <div v-if="hasErrors" class="flex items-center gap-2">
        <Checkbox id="skip" v-model="skipErrors" />
        <Label for="skip">Importar sem as {{ result.errors.length }} linhas com erro</Label>
      </div>
      <div class="ml-auto flex gap-2">
        <Button variant="secondary" :disabled="discard.isPending.value" @click="discard.mutate()"
          >Descartar e enviar outro</Button
        >
        <Button
          class="bg-brand text-brand-foreground hover:bg-brand/90"
          :disabled="!canCommit || commit.isPending.value"
          @click="commit.mutate()"
        >
          <LoaderCircle v-if="commit.isPending.value" class="animate-spin" /> Efetivar importação
        </Button>
      </div>
    </Card>
  </template>
</template>

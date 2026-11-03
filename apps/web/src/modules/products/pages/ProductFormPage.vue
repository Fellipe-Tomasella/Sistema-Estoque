<script setup lang="ts">
import { ChevronDown, LoaderCircle, Save, SlidersHorizontal } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import MoneyInput from '@/components/common/MoneyInput.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import VariantGenerator from '../components/VariantGenerator.vue'
import { useProduct, useProductMutations, useProductSuggestions } from '../composables/useProducts'
import type { VariantDraft } from '../types'

/** Novo produto (com variações e saldo inicial) ou edição (dados do produto + novas variações). */
const route = useRoute()
const router = useRouter()
const productId = computed(() => (route.params.id as string | undefined) ?? '')
const isEdit = computed(() => Boolean(productId.value))

const { data: product } = useProduct(productId)
const { data: suggestions } = useProductSuggestions()
const { create, update, addVariants } = useProductMutations()
const variants = ref<VariantDraft[]>([])
const detailsOpen = ref(false)

const form = useForm({
  validationSchema: toTypedSchema(
    z.object({
      name: z.string({ required_error: 'Informe o nome da peça.' }).trim().min(1, 'Informe o nome da peça.'),
      basePriceCents: z.number({
        required_error: 'Informe o preço de venda.',
        invalid_type_error: 'Informe o preço de venda.',
      }),
      reference: z.string().optional(),
      category: z.string().optional(),
      costCents: z.number().nullable().optional(),
      description: z.string().optional(),
    }),
  ),
  // “Cadastrar produto” a partir de um item da NF-e já vem com o nome da nota
  initialValues: { name: typeof route.query.nome === 'string' ? route.query.nome : undefined },
})

// Edição: preenche o formulário com o produto carregado.
watch(
  product,
  (p) => {
    if (!p) return
    form.resetForm({
      values: {
        name: p.name,
        basePriceCents: p.basePriceCents,
        reference: p.reference ?? '',
        category: p.category ?? '',
        costCents: p.costCents,
        description: p.description ?? '',
      },
    })
    detailsOpen.value = Boolean(p.reference || p.category || p.costCents || p.description)
  },
  { immediate: true },
)

const chosen = computed(() => variants.value.filter((v) => v.enabled))
const pieces = computed(() => chosen.value.reduce((sum, v) => sum + v.initialQty, 0))
const saving = computed(() => create.isPending.value || update.isPending.value || addVariants.isPending.value)

const toApi = (rows: VariantDraft[]) =>
  rows.map(({ color, size, priceCents, initialQty, minStock }) => ({ color, size, priceCents, initialQty, minStock }))

const onSubmit = form.handleSubmit(async (values) => {
  const body = {
    name: values.name,
    basePriceCents: values.basePriceCents,
    reference: values.reference || null,
    category: values.category || null,
    costCents: values.costCents ?? null,
    description: values.description || null,
  }
  if (isEdit.value) {
    await update.mutateAsync({ id: productId.value, body })
    if (chosen.value.length) await addVariants.mutateAsync({ id: productId.value, variants: toApi(chosen.value) })
    toast.success(`${values.name} atualizado.`)
    return router.push(`/produtos/${productId.value}`)
  }
  if (!chosen.value.length) return toast.error('Marque pelo menos uma combinação de cor e tamanho.')
  const created = await create.mutateAsync({ ...body, variants: toApi(chosen.value) })
  toast.success(
    `${created.name} salvo com ${chosen.value.length} ${chosen.value.length === 1 ? 'variação' : 'variações'} e ${pieces.value} ${pieces.value === 1 ? 'peça' : 'peças'} em estoque.`,
  )
  router.push(`/produtos/${created.id}`)
})
</script>

<template>
  <nav class="mb-2 text-sm text-muted-foreground">
    <RouterLink to="/produtos" class="hover:text-foreground">Produtos e estoque</RouterLink>
    <span class="mx-2 text-zinc-300">/</span>
    <span class="font-medium text-foreground">{{ isEdit ? 'Editar produto' : 'Novo produto' }}</span>
  </nav>
  <PageHeader
    :title="isEdit ? (product?.name ?? 'Editar produto') : 'Novo produto'"
    :description="
      isEdit
        ? 'Altere os dados do modelo ou acrescente cores e tamanhos.'
        : 'Cadastre o modelo e gere as combinações de cor e tamanho.'
    "
  />

  <form class="space-y-6 pb-24" novalidate @submit="onSubmit">
    <Card class="gap-4 p-5 shadow-sm">
      <p class="font-semibold">Informações gerais</p>
      <div class="grid gap-4 sm:grid-cols-[1fr_200px]">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>Nome da peça *</FormLabel>
            <FormControl><Input placeholder="Ex.: Blusa básica" v-bind="componentField" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ value, handleChange }" name="basePriceCents">
          <FormItem>
            <FormLabel>Preço de venda *</FormLabel>
            <FormControl><MoneyInput :model-value="value" @update:model-value="handleChange" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>

      <Collapsible v-model:open="detailsOpen" class="rounded-lg bg-muted/50">
        <CollapsibleTrigger class="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium">
          <SlidersHorizontal class="size-4 text-muted-foreground" />
          Mais detalhes (opcionais)
          <ChevronDown :class="cn('ml-auto size-4 transition-transform', detailsOpen && 'rotate-180')" />
        </CollapsibleTrigger>
        <CollapsibleContent class="grid gap-4 px-4 pb-4 sm:grid-cols-3">
          <FormField v-slot="{ componentField }" name="reference">
            <FormItem>
              <FormLabel>Referência</FormLabel>
              <FormControl
                ><Input placeholder="Vazio = código automático (P00001…)" v-bind="componentField"
              /></FormControl>
            </FormItem>
          </FormField>
          <FormField v-slot="{ componentField }" name="category">
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl><Input list="categorias" placeholder="Ex.: Blusas" v-bind="componentField" /></FormControl>
              <datalist id="categorias">
                <option v-for="c in suggestions?.categories" :key="c" :value="c" />
              </datalist>
            </FormItem>
          </FormField>
          <FormField v-slot="{ value, handleChange }" name="costCents">
            <FormItem>
              <FormLabel>Preço de custo</FormLabel>
              <FormControl><MoneyInput :model-value="value" @update:model-value="handleChange" /></FormControl>
            </FormItem>
          </FormField>
          <FormField v-slot="{ componentField }" name="description">
            <FormItem class="sm:col-span-3">
              <FormLabel>Descrição</FormLabel>
              <FormControl
                ><Textarea rows="2" placeholder="Tecido, modelagem, cuidados…" v-bind="componentField"
              /></FormControl>
            </FormItem>
          </FormField>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    <Card class="gap-4 p-5 shadow-sm">
      <div>
        <p class="font-semibold">{{ isEdit ? 'Novas variações' : 'Variações e grade' }}</p>
        <p class="text-sm text-muted-foreground">
          {{
            isEdit
              ? 'As variações que já existem continuam como estão; aqui entram só as novas.'
              : 'Cada combinação de cor e tamanho tem seu próprio saldo.'
          }}
        </p>
      </div>
      <VariantGenerator
        v-model="variants"
        :base-price-cents="form.values.basePriceCents ?? null"
        :existing="product?.variants"
      />
    </Card>

    <div
      class="fixed inset-x-0 bottom-14 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:px-6 lg:left-60 xl:px-8 2xl:px-10"
    >
      <div class="flex items-center gap-3">
        <p class="flex-1 text-sm">
          <span class="font-semibold">{{ chosen.length }} {{ chosen.length === 1 ? 'variação' : 'variações' }}</span>
          <span class="text-muted-foreground">
            · {{ pieces }} {{ pieces === 1 ? 'peça' : 'peças' }} no estoque inicial</span
          >
        </p>
        <Button type="button" variant="secondary" @click="router.back()">Cancelar</Button>
        <Button type="submit" class="bg-brand text-brand-foreground hover:bg-brand/90" :disabled="saving">
          <LoaderCircle v-if="saving" class="animate-spin" /><Save v-else /> Salvar produto
        </Button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { Globe, LoaderCircle } from '@lucide/vue'
import { computed, reactive, watch } from 'vue'
import { toast } from 'vue-sonner'
import MoneyInput from '@/components/common/MoneyInput.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatBRL } from '@/lib/format'
import { useProductMutations } from '../composables/useProducts'
import type { Product } from '../types'

/** Como o produto aparece na loja virtual (RN-LOJ-01 a 04). Não muda o PDV. */
const props = defineProps<{ product: Product }>()
const { update } = useProductMutations()

const form = reactive({ visible: false, priceCents: null as number | null, hidePrice: false, description: '' })
const load = () => Object.assign(form, { ...props.product.site, description: props.product.site.description ?? '' })
watch(() => props.product.site, load, { immediate: true })

const dirty = computed(
  () =>
    form.visible !== props.product.site.visible ||
    form.priceCents !== props.product.site.priceCents ||
    form.hidePrice !== props.product.site.hidePrice ||
    form.description.trim() !== (props.product.site.description ?? ''),
)

/** Preço que o site usa quando o campo fica vazio: o do PDV (faixa, se as variações têm preços próprios). */
const pdvPrice = computed(() => {
  const prices = props.product.variants.map((v) => v.effectivePriceCents)
  const [min, max] = [Math.min(...prices), Math.max(...prices)]
  return min === max ? formatBRL(min) : `${formatBRL(min)} a ${formatBRL(max)}`
})

async function save() {
  await update.mutateAsync({
    id: props.product.id,
    body: {
      showOnSite: form.visible,
      sitePriceCents: form.priceCents,
      hideSitePrice: form.hidePrice,
      siteDescription: form.description,
    },
  })
  toast.success(form.visible ? 'Dados do site salvos: o produto aparece na loja virtual.' : 'Dados do site salvos.')
}
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <Label for="site-visible" class="flex items-center gap-2 text-base font-semibold">
        <Globe class="size-4" /> Mostrar no site
      </Label>
      <Switch id="site-visible" v-model="form.visible" />
    </div>
    <p v-if="!product.active && form.visible" class="-mt-2 text-xs text-amber-700">
      O produto está inativo: só aparece no site depois de reativado.
    </p>

    <div class="space-y-1.5">
      <Label for="site-price">Preço no site</Label>
      <MoneyInput id="site-price" v-model="form.priceCents" :placeholder="`Igual ao PDV`" />
      <p class="text-xs text-muted-foreground">Vazio = preço do PDV ({{ pdvPrice }}). Não muda o preço do PDV.</p>
    </div>

    <div class="flex items-center justify-between gap-3">
      <Label for="site-hide-price" class="font-normal">Esconder preço (mostra “Consulte”)</Label>
      <Switch id="site-hide-price" v-model="form.hidePrice" />
    </div>

    <div class="space-y-1.5">
      <Label for="site-description">Descrição no site</Label>
      <Textarea
        id="site-description"
        v-model="form.description"
        rows="3"
        maxlength="2000"
        placeholder="Tecido, modelagem, cuidados… (a descrição interna não aparece no site)"
      />
    </div>

    <div class="flex justify-end gap-2">
      <Button v-if="dirty" variant="ghost" @click="load">Desfazer</Button>
      <Button :disabled="!dirty || update.isPending.value" @click="save">
        <LoaderCircle v-if="update.isPending.value" class="animate-spin" /> Salvar
      </Button>
    </div>
  </Card>
</template>

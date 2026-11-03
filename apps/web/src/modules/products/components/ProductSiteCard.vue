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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatBRL } from '@/lib/format'
import { useProductMutations } from '../composables/useProducts'
import type { Product } from '../types'

/** Como o produto aparece na loja virtual (RN-LOJ-01 a 04 e 09). Não muda o PDV. */
const props = defineProps<{ product: Product }>()
const { update } = useProductMutations()

type Visibility = 'hidden' | 'unlisted' | 'visible'
const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
  { value: 'visible', label: 'Visível', hint: 'Aparece nas vitrines e categorias do site.' },
  {
    value: 'unlisted',
    label: 'Só pelo link',
    hint: 'Fora das vitrines; abre por quem tiver o link (bom para o WhatsApp).',
  },
  { value: 'hidden', label: 'Oculto', hint: 'Não aparece no site.' },
]
const visibilityOf = (site: Product['site']): Visibility =>
  !site.visible ? 'hidden' : site.unlisted ? 'unlisted' : 'visible'

const form = reactive({
  visibility: 'hidden' as Visibility,
  priceCents: null as number | null,
  compareAtCents: null as number | null,
  hidePrice: false,
  description: '',
})
const load = () =>
  Object.assign(form, {
    visibility: visibilityOf(props.product.site),
    priceCents: props.product.site.priceCents,
    compareAtCents: props.product.site.compareAtCents,
    hidePrice: props.product.site.hidePrice,
    description: props.product.site.description ?? '',
  })
watch(() => props.product.site, load, { immediate: true })

const dirty = computed(
  () =>
    form.visibility !== visibilityOf(props.product.site) ||
    form.priceCents !== props.product.site.priceCents ||
    form.compareAtCents !== props.product.site.compareAtCents ||
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
      showOnSite: form.visibility !== 'hidden',
      siteUnlisted: form.visibility === 'unlisted',
      sitePriceCents: form.priceCents,
      siteCompareAtCents: form.compareAtCents,
      hideSitePrice: form.hidePrice,
      siteDescription: form.description,
    },
  })
  toast.success('Dados do site salvos.')
}
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <p class="flex items-center gap-2 font-semibold"><Globe class="size-4" /> No site</p>

    <div class="space-y-1.5">
      <ToggleGroup
        type="single"
        variant="outline"
        class="w-full"
        :model-value="form.visibility"
        @update:model-value="(v) => v && (form.visibility = v as Visibility)"
      >
        <ToggleGroupItem v-for="v in VISIBILITY" :key="v.value" :value="v.value" class="flex-1 text-xs">
          {{ v.label }}
        </ToggleGroupItem>
      </ToggleGroup>
      <p class="text-xs text-muted-foreground">{{ VISIBILITY.find((v) => v.value === form.visibility)?.hint }}</p>
      <p v-if="!product.active && form.visibility !== 'hidden'" class="text-xs text-amber-700">
        O produto está inativo: só aparece no site depois de reativado.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <Label for="site-price">Preço no site</Label>
        <MoneyInput id="site-price" v-model="form.priceCents" placeholder="Igual ao PDV" />
      </div>
      <div class="space-y-1.5">
        <Label for="site-compare">Preço “de” (riscado)</Label>
        <MoneyInput id="site-compare" v-model="form.compareAtCents" placeholder="Sem promoção" />
      </div>
    </div>
    <p class="-mt-2 text-xs text-muted-foreground">
      Preço vazio = o do PDV ({{ pdvPrice }}). O “de” só aparece se for maior. Nada disso muda o PDV.
    </p>

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

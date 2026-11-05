<script setup lang="ts">
import { slugify, storeSlugProblem } from '@estoque/shared'
import { ExternalLink, Globe, LoaderCircle } from '@lucide/vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, reactive, watch } from 'vue'
import { toast } from 'vue-sonner'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { client, unwrap } from '@/lib/api'
import { queryClient } from '@/lib/query'
import { useStoreSettings } from '../composables/useSettings'

/** Loja virtual (docs/11): endereço, aparência, contato e quem recebe os avisos. Produtos entram pelo cadastro. */
const KEY = ['storefront'] as const
const { data } = useQuery({ queryKey: KEY, queryFn: () => unwrap(client.storefront.settings.get()) })
const { data: store } = useStoreSettings()
const save = useMutation({
  mutationFn: (body: Parameters<typeof client.storefront.settings.put>[0]) =>
    unwrap(client.storefront.settings.put(body)),
  onSuccess: (result) => queryClient.setQueryData(KEY, result),
})

const form = reactive({
  enabled: false,
  slug: '',
  title: '',
  tagline: '',
  announcement: '',
  about: '',
  whatsapp: '',
  instagram: '',
  accentColor: '#7c3aed',
  hideSoldOut: false,
  notifyEmail: '',
  checkoutNotice: '',
  notesLabel: '',
  notesRequired: false,
})
watch(
  data,
  (s) => {
    if (!s) return
    Object.assign(form, {
      enabled: s.enabled,
      slug: s.slug ?? '',
      title: s.title ?? '',
      tagline: s.tagline ?? '',
      announcement: s.announcement ?? '',
      about: s.about ?? '',
      whatsapp: s.whatsapp ?? '',
      instagram: s.instagram ?? '',
      accentColor: s.accentColor,
      hideSoldOut: s.hideSoldOut,
      notifyEmail: s.notifyEmail ?? '',
      checkoutNotice: s.checkoutNotice ?? '',
      notesLabel: s.notesLabel ?? '',
      notesRequired: s.notesRequired,
    })
  },
  { immediate: true },
)

const origin = window.location.origin
const slugProblem = computed(() => (form.slug ? storeSlugProblem(form.slug) : null))
const siteUrl = computed(() => (data.value?.slug ? `${origin}/${data.value.slug}` : null))

function suggestSlug() {
  form.slug = slugify(form.title || store.value?.storeName || '')
}

const orNull = (v: string) => v.trim() || null
async function submit() {
  if (slugProblem.value) return toast.error(slugProblem.value)
  await save.mutateAsync({
    enabled: form.enabled,
    slug: orNull(form.slug),
    title: orNull(form.title),
    tagline: orNull(form.tagline),
    announcement: orNull(form.announcement),
    about: orNull(form.about),
    whatsapp: orNull(form.whatsapp),
    instagram: orNull(form.instagram),
    accentColor: form.accentColor,
    hideSoldOut: form.hideSoldOut,
    notifyEmail: orNull(form.notifyEmail),
    checkoutNotice: orNull(form.checkoutNotice),
    notesLabel: orNull(form.notesLabel),
    notesRequired: form.notesRequired,
  })
  toast.success(form.enabled ? 'Loja virtual salva e no ar.' : 'Loja virtual salva (fora do ar).')
}
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 font-semibold">
        <Globe class="size-4 text-brand" /> Loja virtual
        <StatusBadge :tone="data?.enabled ? 'success' : 'neutral'">{{
          data?.enabled ? 'No ar' : 'Fora do ar'
        }}</StatusBadge>
      </h2>
      <Button v-if="siteUrl" variant="outline" size="sm" as-child>
        <a :href="siteUrl" target="_blank" rel="noopener">
          <ExternalLink /> {{ data?.enabled ? 'Abrir site' : 'Pré-visualizar' }}
        </a>
      </Button>
    </div>
    <p class="-mt-2 text-sm text-muted-foreground">
      Os produtos entram no site pelo cadastro de cada um (“Mostrar no site”). Fora do ar, só você vê, logada.
    </p>

    <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="submit">
      <div class="flex items-center justify-between gap-3 rounded-md border p-3 sm:col-span-2">
        <Label for="sf-enabled" class="font-medium">Site no ar</Label>
        <Switch id="sf-enabled" v-model="form.enabled" />
      </div>

      <div class="space-y-1 sm:col-span-2">
        <Label for="sf-slug">Endereço do site</Label>
        <div class="flex min-w-0 items-center gap-2">
          <Input id="sf-slug" v-model="form.slug" placeholder="jooliv-lingeries" class="min-w-0" />
          <Button type="button" variant="secondary" size="sm" @click="suggestSlug">Sugerir</Button>
        </div>
        <p v-if="slugProblem" class="text-xs text-red-700">{{ slugProblem }}</p>
        <p v-else class="text-xs break-all text-muted-foreground">
          {{ origin }}/<strong class="text-foreground">{{ form.slug || 'nome-da-loja' }}</strong> · letras minúsculas,
          números e hífen. Mudar o endereço quebra links já enviados.
        </p>
      </div>

      <div class="space-y-1">
        <Label for="sf-title">Nome no site</Label>
        <Input id="sf-title" v-model="form.title" :placeholder="store?.storeName ?? 'Nome da loja'" />
      </div>
      <div class="space-y-1">
        <Label for="sf-color">Cor principal</Label>
        <div class="flex items-center gap-2">
          <input id="sf-color" v-model="form.accentColor" type="color" class="h-9 w-12 cursor-pointer rounded border" />
          <span class="text-sm text-muted-foreground tabular">{{ form.accentColor }}</span>
        </div>
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label for="sf-tagline">Frase de apresentação</Label>
        <Input
          id="sf-tagline"
          v-model="form.tagline"
          maxlength="160"
          placeholder="Lingerie com conforto e delicadeza"
        />
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label for="sf-announcement">Faixa de anúncio no topo (opcional)</Label>
        <Input
          id="sf-announcement"
          v-model="form.announcement"
          maxlength="140"
          placeholder="Ex.: Frete grátis para Campinas acima de R$ 199"
        />
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label for="sf-about">Sobre a loja</Label>
        <Textarea id="sf-about" v-model="form.about" rows="3" maxlength="3000" />
      </div>
      <div class="space-y-1">
        <Label for="sf-whatsapp">WhatsApp de atendimento</Label>
        <Input id="sf-whatsapp" v-model="form.whatsapp" inputmode="tel" placeholder="(11) 99999-8888" />
      </div>
      <div class="space-y-1">
        <Label for="sf-instagram">Instagram</Label>
        <Input id="sf-instagram" v-model="form.instagram" placeholder="@sualoja" />
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label for="sf-email">E-mail que recebe os pedidos do site</Label>
        <Input id="sf-email" v-model="form.notifyEmail" type="email" placeholder="voce@email.com" />
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label for="sf-notice">Aviso no finalizar pedido (opcional)</Label>
        <Input
          id="sf-notice"
          v-model="form.checkoutNotice"
          maxlength="500"
          placeholder="Ex.: Trocas em até 7 dias. Enviamos para todo o Brasil."
        />
      </div>
      <div class="space-y-1">
        <Label for="sf-notes-label">Nome do campo de observação</Label>
        <Input id="sf-notes-label" v-model="form.notesLabel" maxlength="80" placeholder="Observação" />
      </div>
      <div class="flex items-end justify-between gap-3 pb-2">
        <Label for="sf-notes-required" class="font-normal">Observação obrigatória</Label>
        <Switch id="sf-notes-required" v-model="form.notesRequired" />
      </div>
      <div class="flex items-center justify-between gap-3 sm:col-span-2">
        <Label for="sf-soldout" class="font-normal">Esconder do site as peças esgotadas</Label>
        <Switch id="sf-soldout" v-model="form.hideSoldOut" />
      </div>

      <div class="flex justify-end sm:col-span-2">
        <Button type="submit" :disabled="save.isPending.value">
          <LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar loja virtual
        </Button>
      </div>
    </form>
  </Card>
</template>

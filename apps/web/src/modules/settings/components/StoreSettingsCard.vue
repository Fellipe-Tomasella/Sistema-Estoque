<script setup lang="ts">
import { LoaderCircle, Store } from '@lucide/vue'
import { reactive, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { TIMEZONES, useStoreSettings } from '../composables/useSettings'

/** Dados da loja (saem no comprovante), fuso horário e parte fiscal (RN-FIS-07). */
const { data, save } = useStoreSettings()
const form = reactive({
  storeName: '',
  legalName: '',
  cnpj: '',
  phone: '',
  email: '',
  city: '',
  uf: '',
  address: '',
  timezone: 'America/Sao_Paulo',
  receiptFooter: '',
  fiscalRulesValidated: false,
})
watch(
  data,
  (s) => {
    if (!s) return
    Object.assign(form, {
      storeName: s.storeName,
      legalName: s.legalName ?? '',
      cnpj: s.cnpj ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      city: s.city ?? '',
      uf: s.uf ?? '',
      address: s.address ?? '',
      timezone: s.timezone,
      receiptFooter: s.receiptFooter ?? '',
      fiscalRulesValidated: s.fiscalRulesValidated,
    })
  },
  { immediate: true },
)

const orNull = (v: string) => v.trim() || null
async function submit() {
  if (!form.storeName.trim()) return toast.error('Informe o nome da loja.')
  await save.mutateAsync({
    storeName: form.storeName.trim(),
    legalName: orNull(form.legalName),
    cnpj: orNull(form.cnpj),
    phone: orNull(form.phone),
    email: orNull(form.email),
    city: orNull(form.city),
    uf: orNull(form.uf.toUpperCase()),
    address: orNull(form.address),
    timezone: form.timezone,
    receiptFooter: orNull(form.receiptFooter),
    fiscalRulesValidated: form.fiscalRulesValidated,
  })
  toast.success('Configurações salvas.')
}
const timezones = () =>
  TIMEZONES.some((t) => t.value === form.timezone)
    ? TIMEZONES
    : [...TIMEZONES, { value: form.timezone, label: form.timezone }]
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold"><Store class="size-4 text-brand" /> Loja</h2>
    <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="submit">
      <div class="space-y-1 sm:col-span-2">
        <Label for="store-name">Nome da loja *</Label>
        <Input id="store-name" v-model="form.storeName" />
      </div>
      <div class="space-y-1">
        <Label for="legal-name">Razão social</Label>
        <Input id="legal-name" v-model="form.legalName" />
      </div>
      <div class="space-y-1">
        <Label for="cnpj">CNPJ (MEI)</Label>
        <Input id="cnpj" v-model="form.cnpj" inputmode="numeric" />
      </div>
      <div class="space-y-1">
        <Label for="store-phone">Telefone</Label>
        <Input id="store-phone" v-model="form.phone" inputmode="tel" />
      </div>
      <div class="space-y-1">
        <Label for="store-email">E-mail</Label>
        <Input id="store-email" v-model="form.email" type="email" />
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label for="store-address">Endereço</Label>
        <Input id="store-address" v-model="form.address" />
      </div>
      <div class="grid grid-cols-[1fr_5rem] gap-3 sm:col-span-2">
        <div class="space-y-1">
          <Label for="store-city">Cidade</Label>
          <Input id="store-city" v-model="form.city" />
        </div>
        <div class="space-y-1">
          <Label for="store-uf">UF</Label>
          <Input id="store-uf" v-model="form.uf" maxlength="2" class="uppercase" />
        </div>
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label>Fuso horário</Label>
        <Select v-model="form.timezone">
          <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="t in timezones()" :key="t.value" :value="t.value">{{ t.label }}</SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">Define a data das vendas, dos relatórios e do fechamento.</p>
      </div>
      <div class="space-y-1 sm:col-span-2">
        <Label for="receipt-footer">Rodapé do comprovante</Label>
        <Textarea
          id="receipt-footer"
          v-model="form.receiptFooter"
          rows="2"
          placeholder="Ex.: Trocas em até 7 dias com etiqueta"
        />
      </div>
      <div class="flex items-start justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
        <div>
          <Label for="fiscal-validated">Regras fiscais conferidas pelo contador</Label>
          <p class="text-xs text-muted-foreground">Enquanto desligado, as pendências fiscais mostram um aviso.</p>
        </div>
        <Switch id="fiscal-validated" v-model="form.fiscalRulesValidated" />
      </div>
      <Button type="submit" class="sm:col-span-2 sm:justify-self-end" :disabled="save.isPending.value">
        <LoaderCircle v-if="save.isPending.value" class="animate-spin" /> Salvar
      </Button>
    </form>
  </Card>
</template>

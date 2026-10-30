<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type Customer, useCustomerMutations } from '../composables/useCustomers'

/** Cadastro de cliente (RN-CLI-01: só o nome é obrigatório). Edita quando recebe `customer`. */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ customer?: Customer | null }>()
const emit = defineEmits<{ saved: [customer: Customer] }>()
const { create, update } = useCustomerMutations()
const addressOpen = ref(false)

const text = z.string().trim().optional()
const form = useForm({
  validationSchema: toTypedSchema(
    z.object({
      name: z.string({ required_error: 'Informe o nome.' }).trim().min(1, 'Informe o nome.'),
      phone: text,
      email: z.union([z.literal(''), z.string().trim().email('E-mail inválido.')]).optional(),
      document: text,
      notes: text,
      zip: text,
      street: text,
      number: text,
      complement: text,
      district: text,
      city: text,
      uf: z.union([z.literal(''), z.string().trim().length(2, 'Use a sigla (ex.: MT).')]).optional(),
    }),
  ),
})

watch(open, (isOpen) => {
  if (!isOpen) return
  const c = props.customer
  const a = c?.address ?? {}
  form.resetForm({
    values: {
      name: c?.name ?? '',
      phone: c?.phone ?? '',
      email: c?.email ?? '',
      document: c?.document ?? '',
      notes: c?.notes ?? '',
      zip: a.zip ?? '',
      street: a.street ?? '',
      number: a.number ?? '',
      complement: a.complement ?? '',
      district: a.district ?? '',
      city: a.city ?? '',
      uf: a.uf ?? '',
    },
  })
  addressOpen.value = Boolean(a.street || a.city)
})

const onSubmit = form.handleSubmit(async (v) => {
  const body = {
    name: v.name,
    phone: v.phone || null,
    email: v.email || null,
    document: v.document || null,
    notes: v.notes || null,
    address: {
      zip: v.zip,
      street: v.street,
      number: v.number,
      complement: v.complement,
      district: v.district,
      city: v.city,
      uf: v.uf,
    },
  }
  const saved = props.customer
    ? await update.mutateAsync({ id: props.customer.id, body })
    : await create.mutateAsync(body)
  toast.success(`${saved.name} ${props.customer ? 'atualizada' : 'cadastrada'}.`)
  emit('saved', saved as Customer)
  open.value = false
})

const field = (name: string, label: string, placeholder = '', cls = '') => ({ name, label, placeholder, cls })
const addressFields = [
  field('zip', 'CEP', '78000-000'),
  field('street', 'Rua', '', 'sm:col-span-2'),
  field('number', 'Número'),
  field('complement', 'Complemento', '', 'sm:col-span-2'),
  field('district', 'Bairro'),
  field('city', 'Cidade'),
  field('uf', 'UF', 'MT'),
]
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90svh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ customer ? 'Editar cliente' : 'Nova cliente' }}</DialogTitle>
        <DialogDescription
          >Só o nome é obrigatório. CPF/CNPJ e endereço quando precisar (nota fiscal, envio).</DialogDescription
        >
      </DialogHeader>
      <form id="customer-form" class="grid gap-4 sm:grid-cols-2" novalidate @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem class="sm:col-span-2">
            <FormLabel>Nome *</FormLabel>
            <FormControl><Input autocomplete="off" v-bind="componentField" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="phone">
          <FormItem>
            <FormLabel>Telefone / WhatsApp</FormLabel>
            <FormControl><Input type="tel" placeholder="(65) 99999-0000" v-bind="componentField" /></FormControl>
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <FormControl><Input type="email" v-bind="componentField" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="document">
          <FormItem class="sm:col-span-2">
            <FormLabel>CPF ou CNPJ</FormLabel>
            <FormControl
              ><Input inputmode="numeric" placeholder="Só se precisar de nota" v-bind="componentField"
            /></FormControl>
          </FormItem>
        </FormField>

        <Collapsible v-model:open="addressOpen" class="sm:col-span-2">
          <CollapsibleTrigger class="text-sm font-medium text-brand hover:underline">
            {{ addressOpen ? 'Esconder endereço' : '+ Endereço de entrega' }}
          </CollapsibleTrigger>
          <CollapsibleContent class="mt-3 grid gap-3 sm:grid-cols-3">
            <FormField v-for="f in addressFields" :key="f.name" v-slot="{ componentField }" :name="f.name">
              <FormItem :class="f.cls">
                <FormLabel>{{ f.label }}</FormLabel>
                <FormControl><Input :placeholder="f.placeholder" v-bind="componentField" /></FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </CollapsibleContent>
        </Collapsible>

        <FormField v-slot="{ componentField }" name="notes">
          <FormItem class="sm:col-span-2">
            <FormLabel>Observações</FormLabel>
            <FormControl><Textarea rows="2" v-bind="componentField" /></FormControl>
          </FormItem>
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="secondary" @click="open = false">Cancelar</Button>
        <Button type="submit" form="customer-form" :disabled="create.isPending.value || update.isPending.value">
          <LoaderCircle v-if="create.isPending.value || update.isPending.value" class="animate-spin" /> Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

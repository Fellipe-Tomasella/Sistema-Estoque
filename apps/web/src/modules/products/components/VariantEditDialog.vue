<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import MoneyInput from '@/components/common/MoneyInput.vue'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { useProductMutations } from '../composables/useProducts'
import type { Variant } from '../types'

/** Editar variação: corrigir cor/tamanho (RN-PRO-09), preço próprio, custo, SKU, mínimo e ativa. */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ variant: Variant | null; basePriceCents: number }>()
const { updateVariant } = useProductMutations()

const optionalInt = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().int('Use um número inteiro.').min(0, 'Não pode ser negativo.').nullable(),
)
const form = useForm({
  validationSchema: toTypedSchema(
    z.object({
      color: z.string().trim().min(1, 'Informe a cor.'),
      size: z.string().trim().min(1, 'Informe o tamanho.'),
      priceCents: z.number().nullable(),
      costCents: z.number().nullable(),
      sku: z.string().optional(),
      minStock: optionalInt,
      active: z.boolean(),
    }),
  ),
})

watch(
  () => [open.value, props.variant] as const,
  ([isOpen, v]) => {
    if (!isOpen || !v) return
    form.resetForm({
      values: {
        color: v.color,
        size: v.size,
        priceCents: v.priceCents,
        costCents: v.costCents,
        sku: v.sku ?? '',
        minStock: v.minStock,
        active: v.active,
      },
    })
  },
)

const onSubmit = form.handleSubmit(async (values) => {
  await updateVariant.mutateAsync({ id: props.variant!.id, body: { ...values, sku: values.sku || null } })
  toast.success(`Variação ${values.color} / ${values.size} salva.`)
  open.value = false
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Editar variação</DialogTitle>
        <DialogDescription>
          Corrigir cor ou tamanho não muda vendas antigas: elas guardam o rótulo da época.
        </DialogDescription>
      </DialogHeader>
      <form id="variant-form" class="grid grid-cols-2 gap-4" novalidate @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="color">
          <FormItem>
            <FormLabel>Cor</FormLabel>
            <FormControl><Input v-bind="componentField" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="size">
          <FormItem>
            <FormLabel>Tamanho</FormLabel>
            <FormControl><Input v-bind="componentField" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ value, handleChange }" name="priceCents">
          <FormItem>
            <FormLabel>Preço próprio</FormLabel>
            <FormControl>
              <MoneyInput
                :model-value="value"
                :placeholder="(basePriceCents / 100).toFixed(2).replace('.', ',')"
                @update:model-value="handleChange"
              />
            </FormControl>
          </FormItem>
        </FormField>
        <FormField v-slot="{ value, handleChange }" name="costCents">
          <FormItem>
            <FormLabel>Custo</FormLabel>
            <FormControl><MoneyInput :model-value="value" @update:model-value="handleChange" /></FormControl>
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="minStock">
          <FormItem>
            <FormLabel>Alerta mínimo</FormLabel>
            <FormControl><Input type="number" min="0" placeholder="Sem alerta" v-bind="componentField" /></FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="sku">
          <FormItem>
            <FormLabel>SKU</FormLabel>
            <FormControl><Input v-bind="componentField" /></FormControl>
          </FormItem>
        </FormField>
        <FormField v-slot="{ value, handleChange }" name="active">
          <FormItem class="col-span-2 flex items-center justify-between rounded-lg border p-3">
            <div>
              <FormLabel>À venda</FormLabel>
              <p class="text-xs text-muted-foreground">Inativa some do PDV, mas fica no histórico.</p>
            </div>
            <FormControl><Switch :model-value="value" @update:model-value="handleChange" /></FormControl>
          </FormItem>
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="secondary" @click="open = false">Cancelar</Button>
        <Button type="submit" form="variant-form" :disabled="updateVariant.isPending.value">
          <LoaderCircle v-if="updateVariant.isPending.value" class="animate-spin" /> Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

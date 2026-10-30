<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { client, unwrap } from '@/lib/api'

const route = useRoute()
const router = useRouter()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const errorMessage = ref(token ? '' : 'Link incompleto. Peça uma nova redefinição de senha.')

const form = useForm({
  validationSchema: toTypedSchema(
    z
      .object({
        password: z
          .string({ required_error: 'Informe a nova senha.' })
          .min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
        confirm: z.string({ required_error: 'Repita a senha.' }),
      })
      .refine((v) => v.password === v.confirm, { message: 'As senhas não conferem.', path: ['confirm'] }),
  ),
})

const onSubmit = form.handleSubmit(async ({ password }) => {
  try {
    await unwrap(client.auth['reset-password'].post({ token, password }))
    toast.success('Senha redefinida. Entre com a nova senha.')
    router.replace('/login')
  } catch (error) {
    errorMessage.value = (error as Error).message
  }
})
</script>

<template>
  <h1 class="text-xl font-semibold tracking-tight">Nova senha</h1>
  <p class="mt-1 mb-6 text-sm text-muted-foreground">Ao salvar, todos os aparelhos precisam entrar de novo.</p>
  <form class="space-y-4" novalidate @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="password">
      <FormItem>
        <FormLabel>Nova senha</FormLabel>
        <FormControl><Input type="password" autocomplete="new-password" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="confirm">
      <FormItem>
        <FormLabel>Repita a senha</FormLabel>
        <FormControl><Input type="password" autocomplete="new-password" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <Alert v-if="errorMessage" variant="destructive"
      ><AlertDescription>{{ errorMessage }}</AlertDescription></Alert
    >
    <Button type="submit" class="w-full" :disabled="!token || form.isSubmitting.value">
      <LoaderCircle v-if="form.isSubmitting.value" class="animate-spin" />
      Salvar nova senha
    </Button>
  </form>
</template>

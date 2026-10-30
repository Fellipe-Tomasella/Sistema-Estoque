<script setup lang="ts">
import { LoaderCircle, MailCheck } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { client, unwrap } from '@/lib/api'

const sent = ref(false)
const form = useForm({
  validationSchema: toTypedSchema(
    z.object({ email: z.string({ required_error: 'Informe o e-mail.' }).email('Informe um e-mail válido.') }),
  ),
})
// A API sempre responde ok, para não revelar se o e-mail existe (RN-ACE-02).
const onSubmit = form.handleSubmit(async ({ email }) => {
  await unwrap(client.auth['forgot-password'].post({ email }))
  sent.value = true
})
</script>

<template>
  <template v-if="sent">
    <MailCheck class="mb-3 size-8 text-brand" />
    <h1 class="text-xl font-semibold tracking-tight">Confira seu e-mail</h1>
    <p class="mt-2 text-sm text-muted-foreground">
      Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha (vale por 1 hora). Se o envio de e-mail
      não estiver configurado, a senha pode ser redefinida pelo servidor.
    </p>
  </template>
  <template v-else>
    <h1 class="text-xl font-semibold tracking-tight">Esqueci a senha</h1>
    <p class="mt-1 mb-6 text-sm text-muted-foreground">Enviamos um link para criar uma nova senha.</p>
    <form class="space-y-4" novalidate @submit="onSubmit">
      <FormField v-slot="{ componentField }" name="email">
        <FormItem>
          <FormLabel>E-mail</FormLabel>
          <FormControl><Input type="email" autocomplete="username" v-bind="componentField" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <Button type="submit" class="w-full" :disabled="form.isSubmitting.value">
        <LoaderCircle v-if="form.isSubmitting.value" class="animate-spin" />
        Enviar link
      </Button>
    </form>
  </template>
  <RouterLink to="/login" class="mt-4 block text-center text-sm font-medium text-brand hover:underline">
    Voltar para o login
  </RouterLink>
</template>

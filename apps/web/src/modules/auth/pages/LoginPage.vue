<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const errorMessage = ref('')

const form = useForm({
  validationSchema: toTypedSchema(
    z.object({
      email: z.string({ required_error: 'Informe o e-mail.' }).email('Informe um e-mail válido.'),
      password: z.string({ required_error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
    }),
  ),
})

const onSubmit = form.handleSubmit(async ({ email, password }) => {
  errorMessage.value = ''
  try {
    await auth.login(email, password)
    const back = typeof route.query.voltar === 'string' && route.query.voltar.startsWith('/') ? route.query.voltar : '/'
    await router.replace(back)
  } catch (error) {
    errorMessage.value = (error as Error).message
  }
})
</script>

<template>
  <h1 class="text-xl font-semibold tracking-tight">Entrar</h1>
  <p class="mt-1 mb-6 text-sm text-muted-foreground">Use o e-mail e a senha da loja.</p>

  <form class="space-y-4" novalidate @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="email">
      <FormItem>
        <FormLabel>E-mail</FormLabel>
        <FormControl><Input type="email" autocomplete="username" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="password">
      <FormItem>
        <div class="flex items-center justify-between">
          <FormLabel>Senha</FormLabel>
          <RouterLink to="/esqueci-senha" class="text-xs font-medium text-brand hover:underline"
            >Esqueci a senha</RouterLink
          >
        </div>
        <FormControl><Input type="password" autocomplete="current-password" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Button type="submit" class="w-full" :disabled="form.isSubmitting.value">
      <LoaderCircle v-if="form.isSubmitting.value" class="animate-spin" />
      Entrar
    </Button>
  </form>
</template>

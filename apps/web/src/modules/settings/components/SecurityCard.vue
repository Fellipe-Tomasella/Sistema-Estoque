<script setup lang="ts">
import { KeyRound, LoaderCircle, LogOut } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth.store'
import { useChangePassword } from '../composables/useSettings'

/** Trocar a senha e sair de todos os aparelhos (ex.: celular perdido). */
const auth = useAuthStore()
const router = useRouter()
const change = useChangePassword()
const form = reactive({ current: '', next: '', repeat: '' })
const confirmLogout = ref(false)
const leaving = ref(false)

async function submit() {
  if (form.next !== form.repeat) return toast.error('A nova senha e a repetição não são iguais.')
  await change.mutateAsync({ current: form.current, next: form.next })
  Object.assign(form, { current: '', next: '', repeat: '' })
  toast.success('Senha alterada.')
}
async function logoutAll() {
  leaving.value = true
  try {
    await auth.logout(true)
    await router.replace('/login')
  } finally {
    leaving.value = false
  }
}
</script>

<template>
  <Card class="gap-4 p-5 shadow-sm">
    <h2 class="flex items-center gap-2 font-semibold"><KeyRound class="size-4 text-brand" /> Acesso</h2>
    <p class="text-sm text-muted-foreground">Conectada como {{ auth.user?.email }}</p>
    <form class="space-y-3" @submit.prevent="submit">
      <div class="space-y-1">
        <Label for="pw-current">Senha atual</Label>
        <Input id="pw-current" v-model="form.current" type="password" autocomplete="current-password" required />
      </div>
      <div class="space-y-1">
        <Label for="pw-next">Nova senha</Label>
        <Input id="pw-next" v-model="form.next" type="password" autocomplete="new-password" required />
      </div>
      <div class="space-y-1">
        <Label for="pw-repeat">Repita a nova senha</Label>
        <Input id="pw-repeat" v-model="form.repeat" type="password" autocomplete="new-password" required />
      </div>
      <Button type="submit" variant="outline" :disabled="change.isPending.value">
        <LoaderCircle v-if="change.isPending.value" class="animate-spin" /> Trocar senha
      </Button>
    </form>
    <div class="border-t pt-4">
      <Button variant="outline" class="text-red-700 hover:text-red-700" @click="confirmLogout = true">
        <LogOut /> Sair de todos os aparelhos
      </Button>
    </div>
    <ConfirmDialog
      v-model:open="confirmLogout"
      title="Sair de todos os aparelhos?"
      description="Notebook e celular precisarão entrar de novo com a senha."
      confirm-label="Sair de todos"
      destructive
      :loading="leaving"
      @confirm="logoutAll"
    />
  </Card>
</template>

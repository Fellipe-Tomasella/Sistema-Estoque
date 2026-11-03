<script setup lang="ts">
import { LogOut, Menu, Plus, Search, Settings } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth.store'

const emit = defineEmits<{ menu: []; search: [] }>()
const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  toast.success('Você saiu do sistema.')
  router.push('/login')
}

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6 xl:px-8 2xl:px-10"
  >
    <Button variant="ghost" size="icon" class="lg:hidden" aria-label="Abrir menu" @click="emit('menu')">
      <Menu />
    </Button>

    <button
      type="button"
      class="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-zinc-300 md:max-w-md xl:max-w-xl"
      @click="emit('search')"
    >
      <Search class="size-4 shrink-0" />
      <span class="truncate">Buscar produto, cliente ou venda #…</span>
      <kbd class="ml-auto hidden rounded border bg-muted px-1.5 text-[11px] font-medium sm:inline">Ctrl K</kbd>
    </button>

    <!-- ações à direita, longe da busca -->
    <div class="ml-auto hidden sm:block" />
    <Button as-child class="hidden bg-brand text-brand-foreground hover:bg-brand/90 sm:inline-flex">
      <RouterLink to="/vender"><Plus /> Nova venda</RouterLink>
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground"
          aria-label="Menu da conta"
        >
          {{ initials(auth.user?.name ?? '?') }}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuLabel>
          <p class="truncate">{{ auth.user?.name }}</p>
          <p class="truncate text-xs font-normal text-muted-foreground">{{ auth.user?.email }}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem as-child>
          <RouterLink to="/configuracoes"><Settings /> Configurações</RouterLink>
        </DropdownMenuItem>
        <DropdownMenuItem @select="logout"><LogOut /> Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </header>
</template>

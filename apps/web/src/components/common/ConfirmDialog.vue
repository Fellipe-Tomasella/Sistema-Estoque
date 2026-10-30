<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

/** Confirmação de ação destrutiva/financeira com o resumo do efeito (06 §1). */
const open = defineModel<boolean>('open', { default: false })
defineProps<{ title: string; description?: string; confirmLabel: string; destructive?: boolean; loading?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="description || $slots.default">
          <slot>{{ description }}</slot>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loading">Voltar</AlertDialogCancel>
        <Button :variant="destructive ? 'destructive' : 'default'" :disabled="loading" @click="emit('confirm')">
          <LoaderCircle v-if="loading" class="animate-spin" /> {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

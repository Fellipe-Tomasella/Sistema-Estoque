<script setup lang="ts">
import { ArrowLeft, ArrowRight, Eye, EyeOff, ImagePlus, LoaderCircle, MoreVertical, Star, Trash2 } from '@lucide/vue'
import { useDropZone } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useProductImages } from '../composables/useProducts'
import type { Product, ProductImage } from '../types'

/** Fotos do produto no detalhe: enviar (botão ou arrastar), capa, ordem, cor, mostrar no site e excluir. */
const props = defineProps<{ product: Product }>()

const MAX = 5
/** Antes de reduzir no aparelho; depois de reduzida, a foto fica em poucas centenas de KB. */
const MAX_BYTES = 40 * 1024 * 1024

const { upload, update, reorder, remove } = useProductImages(() => props.product.id)
const images = computed(() => props.product.images)
const colors = computed(() => [...new Set(props.product.variants.map((v) => v.color))])
const left = computed(() => MAX - images.value.length)
const busy = computed(() => upload.isPending.value || reorder.isPending.value)

const input = useTemplateRef('input')
const dropZone = useTemplateRef('dropZone')
const viewing = ref<ProductImage | null>(null)
const removing = ref<ProductImage | null>(null)
/** “Enviando 1 de 3…” enquanto sobe. */
const progress = ref<{ done: number; total: number } | null>(null)

async function send(files: File[] | FileList | null) {
  const list = [...(files ?? [])]
  if (!list.length) return
  const wrong = list.find((f) => f.type && !f.type.startsWith('image/'))
  if (wrong) return toast.error(`“${wrong.name}” não é uma foto.`)
  const big = list.find((f) => f.size > MAX_BYTES)
  if (big) return toast.error(`“${big.name}” passa de 40 MB.`)
  if (list.length > left.value) {
    return toast.error(left.value ? `Cabem só mais ${left.value} foto(s) neste produto.` : 'O produto já tem 5 fotos.')
  }
  progress.value = { done: 0, total: list.length }
  try {
    await upload.mutateAsync({ files: list, onEach: (done) => (progress.value = { done, total: list.length }) })
    toast.success(list.length === 1 ? 'Foto enviada.' : `${list.length} fotos enviadas.`)
  } finally {
    progress.value = null
  }
}

function pick(event: Event) {
  const target = event.target as HTMLInputElement
  send(target.files).finally(() => (target.value = ''))
}

const { isOverDropZone } = useDropZone(dropZone, { onDrop: (files) => send(files), multiple: true })

function move(index: number, to: number) {
  const ids = images.value.map((i) => i.id)
  const [id] = ids.splice(index, 1)
  ids.splice(to, 0, id!)
  reorder.mutate(ids)
}

async function confirmRemove() {
  try {
    await remove.mutateAsync(removing.value!.id)
    toast.success('Foto excluída.')
  } finally {
    removing.value = null
  }
}
</script>

<template>
  <Card class="gap-3 p-5 shadow-sm">
    <div class="flex items-center justify-between gap-2">
      <p class="font-semibold">
        Fotos <span class="text-sm font-normal text-muted-foreground">{{ images.length }} de {{ MAX }}</span>
      </p>
      <Button v-if="left > 0" variant="secondary" size="sm" :disabled="busy" @click="input?.click()">
        <LoaderCircle v-if="upload.isPending.value" class="animate-spin" /><ImagePlus v-else />
        {{ progress ? `Enviando ${Math.min(progress.done + 1, progress.total)} de ${progress.total}…` : 'Adicionar' }}
      </Button>
      <input ref="input" type="file" accept="image/*" multiple class="hidden" @change="pick" />
    </div>

    <div
      ref="dropZone"
      :class="cn('rounded-lg transition-colors', isOverDropZone && 'bg-primary/5 ring-2 ring-primary ring-offset-2')"
    >
      <button
        v-if="images.length === 0"
        type="button"
        class="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm text-muted-foreground hover:bg-muted/50"
        :disabled="busy"
        @click="input?.click()"
      >
        <LoaderCircle v-if="upload.isPending.value" class="size-6 animate-spin" />
        <ImagePlus v-else class="size-6" />
        <span>Arraste as fotos aqui ou toque para escolher</span>
        <span class="text-xs">Até 5 fotos · JPG, PNG ou WebP · a primeira é a capa</span>
      </button>

      <ul v-else class="grid grid-cols-3 gap-2">
        <li v-for="(image, index) in images" :key="image.id" class="group relative">
          <button
            type="button"
            class="block aspect-square w-full overflow-hidden rounded-md border bg-muted"
            :aria-label="`Ver foto ${index + 1}`"
            @click="viewing = image"
          >
            <img :src="image.thumbUrl" alt="" class="size-full object-cover" loading="lazy" />
          </button>
          <div class="pointer-events-none absolute inset-x-1 top-1 flex flex-wrap gap-1">
            <StatusBadge v-if="index === 0" tone="info">Capa</StatusBadge>
            <StatusBadge v-if="!image.showOnSite" tone="neutral">Só interna</StatusBadge>
          </div>
          <p v-if="image.color" class="mt-1 truncate text-center text-xs text-muted-foreground">{{ image.color }}</p>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="secondary"
                size="icon-sm"
                class="absolute right-1 bottom-1 shadow-sm"
                :class="image.color && 'bottom-6'"
                aria-label="Opções da foto"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem v-if="index > 0" @select="move(index, 0)"><Star /> Usar como capa</DropdownMenuItem>
              <DropdownMenuItem v-if="index > 0" @select="move(index, index - 1)">
                <ArrowLeft /> Mover para a esquerda
              </DropdownMenuItem>
              <DropdownMenuItem v-if="index < images.length - 1" @select="move(index, index + 1)">
                <ArrowRight /> Mover para a direita
              </DropdownMenuItem>
              <DropdownMenuItem @select="update.mutate({ imageId: image.id, body: { showOnSite: !image.showOnSite } })">
                <component :is="image.showOnSite ? EyeOff : Eye" />
                {{ image.showOnSite ? 'Não mostrar no site' : 'Mostrar no site' }}
              </DropdownMenuItem>
              <template v-if="colors.length > 1">
                <DropdownMenuSeparator />
                <DropdownMenuLabel class="text-xs text-muted-foreground">Foto da cor</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  :model-value="image.color ?? ''"
                  @update:model-value="update.mutate({ imageId: image.id, body: { color: String($event) || null } })"
                >
                  <DropdownMenuRadioItem value="">Todas as cores</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem v-for="color in colors" :key="color" :value="color">
                    {{ color }}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </template>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" @select="removing = image"><Trash2 /> Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ul>
    </div>

    <Dialog :open="viewing !== null" @update:open="!$event && (viewing = null)">
      <DialogContent class="p-2 sm:max-w-3xl sm:p-3">
        <DialogTitle class="sr-only">Foto de {{ product.name }}</DialogTitle>
        <img
          v-if="viewing"
          :src="viewing.largeUrl"
          :alt="product.name"
          class="max-h-[80vh] w-full rounded object-contain"
        />
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      :open="removing !== null"
      title="Excluir esta foto?"
      description="Ela some do catálogo, do PDV e do site."
      confirm-label="Excluir"
      destructive
      :loading="remove.isPending.value"
      @update:open="!$event && (removing = null)"
      @confirm="confirmRemove"
    />
  </Card>
</template>

<script setup lang="ts">
import { CameraOff, LoaderCircle, ScanLine } from '@lucide/vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/**
 * Ler código de barras pela câmera (celular ou webcam). Cada código lido é emitido; o mesmo código só conta de
 * novo depois de 2 s, para não somar a mesma peça várias vezes enquanto ela está na frente da câmera.
 */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ code: [code: string] }>()

const video = ref<HTMLVideoElement | null>(null)
const state = ref<'starting' | 'scanning' | 'error'>('starting')
const error = ref('')
const lastCodes: string[] = []
let controls: { stop: () => void } | null = null
let recent = new Map<string, number>()

async function start() {
  state.value = 'starting'
  recent = new Map()
  try {
    // carregado só quando a câmera é aberta (a biblioteca de leitura é grande)
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const reader = new BrowserMultiFormatReader()
    controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } },
      video.value!,
      (result) => {
        if (!result) return
        const code = result.getText()
        const now = Date.now()
        if (now - (recent.get(code) ?? 0) < 2000) return
        recent.set(code, now)
        lastCodes.unshift(code)
        emit('code', code)
      },
    )
    state.value = 'scanning'
  } catch (e) {
    state.value = 'error'
    error.value =
      (e as Error).name === 'NotAllowedError'
        ? 'A câmera foi bloqueada. Libere o acesso à câmera nas permissões do navegador.'
        : 'Não foi possível abrir a câmera neste aparelho.'
  }
}

function stop() {
  controls?.stop()
  controls = null
}

watch(open, async (isOpen) => {
  if (isOpen) {
    await new Promise((r) => setTimeout(r, 50)) // espera o <video> do diálogo existir
    start()
  } else stop()
})
onBeforeUnmount(stop)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md gap-3 p-4">
      <DialogTitle class="flex items-center gap-2"><ScanLine class="size-5" /> Ler código pela câmera</DialogTitle>
      <DialogDescription>Aponte para o código de barras da etiqueta. Cada peça lida entra na venda.</DialogDescription>
      <div class="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
        <video ref="video" class="size-full object-cover" muted playsinline />
        <div
          v-if="state === 'scanning'"
          class="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,.7)]"
        />
        <div v-if="state === 'starting'" class="absolute inset-0 flex items-center justify-center text-white">
          <LoaderCircle class="size-8 animate-spin" />
        </div>
        <div
          v-if="state === 'error'"
          class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white"
        >
          <CameraOff class="size-8" /> {{ error }}
        </div>
      </div>
      <p class="text-xs text-muted-foreground">Dica: com o leitor USB não precisa abrir nada, é só bipar.</p>
    </DialogContent>
  </Dialog>
</template>

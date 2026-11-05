<script setup lang="ts">
import { CameraOff, CheckCircle2, Flashlight, LoaderCircle, ScanLine, X, XCircle } from '@lucide/vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { DecodeHintType as ZxingHint } from '@zxing/library'

/**
 * Leitura pela câmera do celular ou da webcam, como um leitor de mão: a pessoa mira a etiqueta dentro da moldura e
 * aperta “Bipar” (captura o quadro e lê). Usa o leitor nativo do aparelho quando existe (Android), senão o ZXing.
 * Pede foco contínuo, resolução alta e um pouco de zoom: com zoom dá para afastar a etiqueta e a câmera foca.
 */
const open = defineModel<boolean>('open', { required: true })
/** Quem usa a câmera procura a peça e devolve o texto do aviso (ok = entrou na venda). */
const props = defineProps<{ handle: (code: string) => Promise<{ ok: boolean; text: string }> }>()

type Detector = (canvas: HTMLCanvasElement) => Promise<string | null>
type NativeDetector = new (options: object) => {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}

const video = ref<HTMLVideoElement | null>(null)
const state = ref<'starting' | 'ready' | 'error'>('starting')
const error = ref('')
const busy = ref(false)
const auto = ref(false)
const torch = ref<boolean | null>(null) // null = aparelho sem lanterna
const zoom = ref<{ min: number; max: number; value: number } | null>(null)
const feedback = ref<{ ok: boolean; text: string } | null>(null)
const count = ref(0)

let stream: MediaStream | null = null
let detect: Detector | null = null
let autoTimer: ReturnType<typeof setInterval> | null = null
let lastCode = ''
let lastAt = 0
const canvas = document.createElement('canvas')

/** Leitor nativo (BarcodeDetector) se o aparelho tiver; senão ZXing com “tentar mais”. */
async function makeDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: NativeDetector }).BarcodeDetector
  if (Native) {
    try {
      const native = new Native({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'code_39', 'itf'] })
      return async (c) => (await native.detect(c))[0]?.rawValue ?? null
    } catch {
      // formatos não suportados: segue com o ZXing
    }
  }
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  const hints = new Map<ZxingHint, unknown>([
    [DecodeHintType.TRY_HARDER, true],
    [
      DecodeHintType.POSSIBLE_FORMATS,
      [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.UPC_A,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
      ],
    ],
  ])
  const reader = new BrowserMultiFormatReader(hints)
  return async (c) => {
    try {
      return reader.decodeFromCanvas(c).getText()
    } catch {
      return null
    }
  }
}

async function start() {
  state.value = 'starting'
  feedback.value = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    })
    video.value!.srcObject = stream
    await video.value!.play()
    const track = stream.getVideoTracks()[0]!
    const caps = (track.getCapabilities?.() ?? {}) as {
      focusMode?: string[]
      torch?: boolean
      zoom?: { min: number; max: number }
    }
    const advanced: Record<string, unknown>[] = []
    if (caps.focusMode?.includes('continuous')) advanced.push({ focusMode: 'continuous' })
    if (caps.zoom) {
      const value = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 2))
      zoom.value = { min: caps.zoom.min, max: Math.min(caps.zoom.max, 5), value }
      advanced.push({ zoom: value })
    }
    if (advanced.length) await track.applyConstraints({ advanced } as MediaTrackConstraints).catch(() => {})
    torch.value = caps.torch ? false : null
    detect = await makeDetector()
    state.value = 'ready'
    if (auto.value) startAuto()
  } catch (e) {
    state.value = 'error'
    error.value =
      (e as Error).name === 'NotAllowedError'
        ? 'A câmera foi bloqueada. Libere o acesso à câmera nas permissões do navegador.'
        : 'Não foi possível abrir a câmera neste aparelho.'
  }
}

function stop() {
  stopAuto()
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

/** Quadro atual recortado na moldura (faixa do meio); se não ler, tenta a imagem inteira. */
async function readFrame(): Promise<string | null> {
  const v = video.value
  if (!v || !detect || !v.videoWidth) return null
  const w = v.videoWidth
  const h = v.videoHeight
  const crops: [number, number, number, number][] = [
    [w * 0.08, h * 0.3, w * 0.84, h * 0.4],
    [0, 0, w, h],
  ]
  for (const [x, y, cw, ch] of crops) {
    canvas.width = cw
    canvas.height = ch
    canvas.getContext('2d', { willReadFrequently: true })!.drawImage(v, x, y, cw, ch, 0, 0, cw, ch)
    const code = await detect(canvas)
    if (code) return code
  }
  return null
}

async function shoot(fromAuto = false) {
  if (busy.value || state.value !== 'ready') return
  busy.value = true
  try {
    const code = await readFrame()
    if (!code) {
      if (!fromAuto) {
        feedback.value = { ok: false, text: 'Não consegui ler. Centralize o código na moldura e aperte de novo.' }
      }
      return
    }
    // no automático, o mesmo código só conta de novo depois de 2,5 s
    if (fromAuto && code === lastCode && Date.now() - lastAt < 2500) return
    lastCode = code
    lastAt = Date.now()
    feedback.value = await props.handle(code)
    if (feedback.value.ok) count.value++
  } finally {
    busy.value = false
  }
}

function startAuto() {
  stopAuto()
  autoTimer = setInterval(() => shoot(true), 450)
}
function stopAuto() {
  if (autoTimer) clearInterval(autoTimer)
  autoTimer = null
}
watch(auto, (on) => (on && state.value === 'ready' ? startAuto() : stopAuto()))

async function toggleTorch() {
  const track = stream?.getVideoTracks()[0]
  if (!track || torch.value === null) return
  torch.value = !torch.value
  await track
    .applyConstraints({ advanced: [{ torch: torch.value }] } as unknown as MediaTrackConstraints)
    .catch(() => {})
}
async function setZoom(value: number) {
  const track = stream?.getVideoTracks()[0]
  if (!track || !zoom.value) return
  zoom.value.value = value
  await track.applyConstraints({ advanced: [{ zoom: value }] } as unknown as MediaTrackConstraints).catch(() => {})
}

// o aviso some sozinho (o de sucesso mais rápido)
watch(feedback, (current) => {
  if (!current) return
  setTimeout(() => feedback.value === current && (feedback.value = null), current.ok ? 2200 : 3500)
})

watch(open, async (isOpen) => {
  if (isOpen) {
    count.value = 0
    await new Promise((r) => setTimeout(r, 60)) // espera o <video> do diálogo existir
    start()
  } else stop()
})
onBeforeUnmount(stop)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="flex h-[100svh] max-h-[100svh] max-w-full flex-col gap-3 rounded-none border-0 p-3 sm:h-auto sm:max-h-[90svh] sm:max-w-lg sm:rounded-lg sm:border sm:p-4"
    >
      <div class="flex items-center justify-between gap-2">
        <DialogTitle class="flex items-center gap-2"><ScanLine class="size-5" /> Ler pela câmera</DialogTitle>
        <Button variant="ghost" size="icon" aria-label="Fechar câmera" @click="open = false"><X /></Button>
      </div>
      <DialogDescription class="-mt-2">
        Mire o código dentro da moldura e aperte <b>Bipar</b>. Se ficar borrado, afaste um pouco o celular.
      </DialogDescription>

      <div class="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black sm:aspect-[4/3] sm:flex-none">
        <video ref="video" class="size-full object-cover" muted playsinline @click="shoot()" />
        <!-- moldura: onde o código deve ficar -->
        <div
          v-if="state === 'ready'"
          class="pointer-events-none absolute inset-x-[8%] top-[30%] h-[40%] rounded-xl border-2 border-white/90 shadow-[0_0_0_100vmax_rgba(0,0,0,.35)]"
        >
          <div
            class="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,.8)]"
          />
        </div>
        <div v-if="state === 'starting'" class="absolute inset-0 flex items-center justify-center text-white">
          <LoaderCircle class="size-8 animate-spin" />
        </div>
        <div
          v-if="state === 'error'"
          class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white"
        >
          <CameraOff class="size-8" /> {{ error }}
        </div>

        <!-- aviso grande do que aconteceu -->
        <Transition
          enter-from-class="opacity-0 -translate-y-3"
          leave-to-class="opacity-0"
          enter-active-class="transition duration-200"
          leave-active-class="transition duration-300"
        >
          <div
            v-if="feedback"
            :class="
              cn(
                'absolute inset-x-3 top-3 flex items-start gap-3 rounded-xl p-4 text-white shadow-lg',
                feedback.ok ? 'bg-emerald-600' : 'bg-red-600',
              )
            "
            role="status"
          >
            <component :is="feedback.ok ? CheckCircle2 : XCircle" class="size-7 shrink-0" />
            <p class="text-base leading-snug font-semibold">{{ feedback.text }}</p>
          </div>
        </Transition>
        <p
          v-if="count"
          class="absolute right-3 bottom-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white"
        >
          {{ count }} {{ count === 1 ? 'peça lida' : 'peças lidas' }}
        </p>
      </div>

      <div v-if="zoom" class="flex items-center gap-3 text-sm">
        <span class="shrink-0 text-muted-foreground">Zoom</span>
        <input
          type="range"
          class="w-full accent-[var(--brand)]"
          :min="zoom.min"
          :max="zoom.max"
          step="0.1"
          :value="zoom.value"
          aria-label="Zoom da câmera"
          @input="setZoom(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="w-10 shrink-0 text-right tabular">{{ zoom.value.toFixed(1) }}×</span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          v-if="torch !== null"
          variant="outline"
          size="icon"
          :class="cn('size-14 shrink-0', torch && 'bg-amber-100')"
          aria-label="Lanterna"
          @click="toggleTorch"
        >
          <Flashlight class="size-6" />
        </Button>
        <Button
          class="h-14 flex-1 bg-brand text-lg text-brand-foreground hover:bg-brand/90"
          :disabled="state !== 'ready' || busy"
          @click="shoot()"
        >
          <LoaderCircle v-if="busy" class="size-6 animate-spin" /><ScanLine v-else class="size-6" /> Bipar
        </Button>
      </div>
      <label class="flex items-center justify-between gap-3 text-sm">
        <span>Leitura automática <span class="text-muted-foreground">(sem apertar)</span></span>
        <Switch v-model="auto" />
      </label>
    </DialogContent>
  </Dialog>
</template>

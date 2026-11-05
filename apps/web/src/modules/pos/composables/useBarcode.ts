import { useEventListener } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { ApiError, client, unwrap } from '@/lib/api'
import type { VariantSearchResult } from '@/modules/products/types'

/** Peça pelo código bipado (código de barras, SKU ou código do fornecedor). */
export const findByCode = (code: string) => unwrap(client.variants['by-code']({ code }).get())

/** Código “de máquina”: sem espaço, 4+ caracteres, com algum dígito (não é uma busca por nome). */
export const looksLikeCode = (text: string) => /^[\w.-]{4,}$/.test(text) && /\d/.test(text)

let audio: AudioContext | null = null
/** Bipe curto de confirmação (leitor e câmera). */
export function beep(ok = true) {
  try {
    audio ??= new AudioContext()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = ok ? 1250 : 320
    gain.gain.value = 0.08
    osc.connect(gain).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + (ok ? 0.08 : 0.25))
  } catch {
    // sem áudio: só o aviso na tela
  }
  navigator.vibrate?.(ok ? 40 : [60, 40, 60])
}

/**
 * Procura o código e entrega a peça; bipe de confirmação e o texto do aviso. `quiet` = quem chamou mostra o aviso
 * (a câmera mostra o dela, grande); senão aparece no canto da tela.
 */
export async function addByCode(code: string, add: (variant: VariantSearchResult) => void, quiet = false) {
  try {
    const variant = await findByCode(code)
    add(variant)
    beep(true)
    const text = `${variant.productName} · ${variant.label} adicionada`
    if (!quiet) toast.success(text)
    return { ok: true, text }
  } catch (error) {
    beep(false)
    const text = error instanceof ApiError ? error.message : 'Não foi possível ler o código.'
    if (!quiet) toast.error(text)
    return { ok: false, text }
  }
}

/**
 * Leitor USB/Bluetooth (age como teclado): reconhece a rajada de teclas rápidas terminada em Enter, mesmo com o
 * cursor fora de um campo. Com o cursor numa caixa de texto, quem trata é a própria busca (Enter com código).
 */
export function useBarcodeScanner(onCode: (code: string) => void) {
  let buffer = ''
  let last = 0
  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target?.closest?.('input, textarea, select, [contenteditable]')) return
    const now = performance.now()
    if (now - last > 80) buffer = ''
    last = now
    if (e.key === 'Enter') {
      if (buffer.length >= 4) {
        e.preventDefault()
        onCode(buffer)
      }
      buffer = ''
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      buffer += e.key
    }
  })
}

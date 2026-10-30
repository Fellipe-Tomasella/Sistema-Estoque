import { useMediaQuery } from '@vueuse/core'
import { shallowRef } from 'vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Pedido de instalação do navegador (Chrome/Android). Chega cedo, por isso é capturado ao carregar o app. */
const installEvent = shallowRef<InstallPromptEvent | null>(null)
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  installEvent.value = event as InstallPromptEvent
})
window.addEventListener('appinstalled', () => (installEvent.value = null))

export function useInstall() {
  const installed = useMediaQuery('(display-mode: standalone)')
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  async function install() {
    const event = installEvent.value
    if (!event) return false
    await event.prompt()
    const { outcome } = await event.userChoice
    installEvent.value = null
    return outcome === 'accepted'
  }
  return { canPrompt: installEvent, installed, isIos, install }
}

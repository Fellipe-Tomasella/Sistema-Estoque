import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones do PWA a partir de public/icon.svg: bunx pwa-assets-generator
export default defineConfig({
  preset: { ...minimal2023Preset, maskable: { ...minimal2023Preset.maskable, padding: 0 } },
  images: ['public/icon.svg'],
})

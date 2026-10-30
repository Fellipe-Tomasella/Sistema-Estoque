import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // PWA instalável (decisão 006): o service worker guarda só o app (HTML/JS/CSS/ícones).
    // Dados da API nunca vão para cache — sem rede, a tela avisa que está off-line.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Estoque e Vendas',
        short_name: 'Estoque',
        description: 'Estoque, vendas e fiado da loja',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#4f46e5',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Mesma origem em desenvolvimento: o navegador fala só com o Vite, que repassa /api para a API.
    // 127.0.0.1 e não localhost: no Windows “localhost” resolve para IPv6 (::1) e a API escuta em IPv4.
    // API_PORT: os testes E2E sobem outra API (banco de teste) em outra porta.
    proxy: { '/api': { target: `http://127.0.0.1:${process.env.API_PORT ?? 3000}`, changeOrigin: false } },
  },
})

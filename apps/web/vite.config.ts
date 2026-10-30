import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Mesma origem em desenvolvimento: o navegador fala só com o Vite, que repassa /api para a API.
    // 127.0.0.1 e não localhost: no Windows “localhost” resolve para IPv6 (::1) e a API escuta em IPv4.
    proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false } },
  },
})

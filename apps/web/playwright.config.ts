import { defineConfig, devices } from '@playwright/test'

// E2E dos cenários A1–A10 (docs/04) contra o banco de TESTE: uma API própria (porta 3100, NODE_ENV=test)
// e um Vite próprio (5174) — não mexe no banco de desenvolvimento nem nos servidores do `bun run dev`.
const API_PORT = 3100
const WEB_PORT = 5174
const WEB_URL = `http://localhost:${WEB_PORT}`

export default defineConfig({
  testDir: './e2e',
  // Os cenários dividem o mesmo banco e saldo de estoque: um de cada vez, na ordem dos arquivos.
  workers: 1,
  fullyParallel: false,
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list']],
  use: {
    baseURL: WEB_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 900 },
        storageState: 'e2e/.auth/state.json',
      },
    },
  ],
  webServer: [
    {
      command: 'bun --env-file=../../.env src/index.ts',
      cwd: '../api',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { NODE_ENV: 'test', PORT: String(API_PORT), APP_ORIGIN: WEB_URL },
      reuseExistingServer: false,
    },
    {
      command: `bunx vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      env: { API_PORT: String(API_PORT) },
      reuseExistingServer: false,
    },
  ],
})

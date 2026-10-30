import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Banco de teste zerado com o cenário conhecido (apps/api/test/e2e-seed.ts) antes de cada execução. */
export default function globalSetup() {
  execSync('bun --env-file=../../.env test/e2e-seed.ts', {
    cwd: fileURLToPath(new URL('../../api', import.meta.url)),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
  })
}

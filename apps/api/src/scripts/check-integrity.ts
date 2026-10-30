// Verifica os invariantes do banco e sai com código 1 se algum falhar.
// Uso: bun src/scripts/check-integrity.ts
import { services } from '../container'
import { run } from './cli'

await run(async () => {
  const checks = await services.integrity.run()
  for (const check of checks) {
    console.log(`${check.ok ? 'OK   ' : 'FALHA'} ${check.name}`)
    for (const problem of check.problems.slice(0, 20)) console.log('      ', JSON.stringify(problem))
  }
  if (checks.some((check) => !check.ok)) process.exitCode = 1
})

// Define uma nova senha pelo servidor (recuperação sem e-mail). Encerra todas as sessões abertas.
// Uso: bun src/scripts/reset-password.ts --email "maria@exemplo.com"
import { services } from '../container'
import { askPassword, fail, readOptions, run } from './cli'

await run(async () => {
  const { email } = readOptions(['email'])
  if (!email) fail('Informe --email.')
  await services.auth.setPasswordByEmail(email, askPassword())
  console.log('Senha redefinida. Entre de novo em todos os aparelhos.')
})

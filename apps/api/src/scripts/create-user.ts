// Cria a conta da dona (não há cadastro público).
// Uso: bun src/scripts/create-user.ts --name "Maria" --email "maria@exemplo.com"
import { services } from '../container'
import { askPassword, fail, readOptions, run } from './cli'

await run(async () => {
  const { name, email } = readOptions(['name', 'email'])
  if (!name || !email) fail('Informe --name e --email.')
  const user = await services.auth.createUser({ name, email, password: askPassword() })
  console.log(`Conta criada: ${user.name} <${user.email}>`)
})

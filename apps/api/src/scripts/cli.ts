// Utilitários dos scripts de linha de comando rodados no servidor.
import { parseArgs } from 'node:util'
import { sql } from '../db/client'
import { AppError } from '../shared/errors'

export function readOptions<T extends string>(names: readonly T[]): Record<T, string | undefined> {
  const { values } = parseArgs({
    options: Object.fromEntries(names.map((name) => [name, { type: 'string' as const }])),
    allowPositionals: false,
  })
  return values as Record<T, string | undefined>
}

export function askPassword(): string {
  const password = prompt('Nova senha:') ?? ''
  const confirmation = prompt('Repita a senha:') ?? ''
  if (password !== confirmation) fail('As senhas não conferem.')
  return password
}

export function fail(message: string): never {
  console.error(`Erro: ${message}`)
  process.exit(1)
}

/** Executa o script, mostra erros de negócio de forma legível e fecha a conexão. */
export async function run(main: () => Promise<void>) {
  try {
    await main()
  } catch (error) {
    fail(error instanceof AppError ? error.message : String(error))
  } finally {
    await sql.end()
  }
}

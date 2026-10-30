// Carregado antes de todos os testes da API: aplica migrations no banco de teste (DATABASE_URL_TEST).
import { afterAll, beforeAll } from 'bun:test'
import { sql } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

beforeAll(async () => {
  await runMigrations()
})

afterAll(async () => {
  await sql.end()
})

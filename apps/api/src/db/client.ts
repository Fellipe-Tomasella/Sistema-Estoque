import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../config/env'
import * as schema from './schema'

export const sql = postgres(env.databaseUrl, { max: env.isTest ? 5 : 10, onnotice: () => {} })
export const db = drizzle(sql, { schema, casing: 'snake_case' })

export type Database = typeof db
/** Transação aberta por um service; repositories aceitam `Database | Tx`. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
export type DbOrTx = Database | Tx

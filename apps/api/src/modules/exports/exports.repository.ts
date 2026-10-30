import { sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'

/** Tabelas que vão na cópia dos dados da loja (sem usuários, sessões nem senhas). */
export const EXPORT_TABLES = {
  produtos: 'products',
  variacoes: 'variants',
  movimentos_estoque: 'stock_movements',
  entradas: 'stock_entries',
  itens_entradas: 'stock_entry_items',
  clientes: 'customers',
  vendas: 'sales',
  itens_vendas: 'sale_items',
  pagamentos: 'payments',
  dividas: 'receivables',
  abatimentos_dividas: 'receivable_allocations',
  ajustes_dividas: 'receivable_adjustments',
  devolucoes: 'returns',
  itens_devolucoes: 'return_items',
  devolucoes_valor: 'refunds',
  notas_fiscais: 'fiscal_documents',
  fechamentos: 'daily_closings',
} as const

export class ExportsRepository {
  constructor(private readonly db: DbOrTx) {}

  /** Todas as linhas da tabela, na ordem em que foram criadas. Nomes vêm da lista fixa acima. */
  async dump(table: (typeof EXPORT_TABLES)[keyof typeof EXPORT_TABLES]) {
    // Tabelas de itens não têm created_at; o id (uuid v7) já segue a ordem de criação.
    const order = table === 'daily_closings' ? 'business_date' : 'id'
    return [...(await this.db.execute<Record<string, unknown>>(sql.raw(`select * from ${table} order by ${order}`)))]
  }
}

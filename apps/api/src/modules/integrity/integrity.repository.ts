import { sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'

/** Consultas de verificação dos invariantes de `docs/03-modelo-de-dados.md` §4. Cada uma devolve só as linhas com problema. */
export class IntegrityRepository {
  constructor(private readonly db: DbOrTx) {}

  /** Invariante 1: `variants.stock_qty` = soma do ledger. */
  stockMismatches() {
    return this.db.execute<{ variant_id: string; stock_qty: number; ledger_qty: number }>(sql`
      select v.id as variant_id, v.stock_qty, coalesce(sum(m.quantity_delta), 0)::int as ledger_qty
      from variants v
      left join stock_movements m on m.variant_id = v.id
      group by v.id
      having v.stock_qty <> coalesce(sum(m.quantity_delta), 0)`)
  }
}

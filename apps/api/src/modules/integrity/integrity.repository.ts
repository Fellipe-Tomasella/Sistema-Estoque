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

  /** Invariante 2 (ajustes): `receivables.adjusted_cents` = soma dos ajustes (cancelamento, devolução). */
  receivableAdjustedMismatches() {
    return this.db.execute<{ receivable_id: string; adjusted_cents: number; adjustments_cents: number }>(sql`
      select r.id as receivable_id, r.adjusted_cents, coalesce(sum(a.amount_cents), 0)::int as adjustments_cents
      from receivables r
      left join receivable_adjustments a on a.receivable_id = r.id
      group by r.id
      having r.adjusted_cents <> coalesce(sum(a.amount_cents), 0)`)
  }

  /** Invariante 4: `sale_items.returned_qty` = soma das peças nas devoluções do item. */
  returnedQtyMismatches() {
    return this.db.execute<{ sale_item_id: string; returned_qty: number; return_items_qty: number }>(sql`
      select si.id as sale_item_id, si.returned_qty, coalesce(sum(ri.quantity), 0)::int as return_items_qty
      from sale_items si
      left join return_items ri on ri.sale_item_id = si.id
      group by si.id
      having si.returned_qty <> coalesce(sum(ri.quantity), 0)`)
  }

  /** Invariante 2: `receivables.paid_cents` = soma dos abatimentos de pagamentos válidos. */
  receivablePaidMismatches() {
    return this.db.execute<{ receivable_id: string; paid_cents: number; allocated_cents: number }>(sql`
      select r.id as receivable_id, r.paid_cents, coalesce(sum(a.amount_cents) filter (where p.status = 'valid'), 0)::int as allocated_cents
      from receivables r
      left join receivable_allocations a on a.receivable_id = r.id
      left join payments p on p.id = a.payment_id
      group by r.id
      having r.paid_cents <> coalesce(sum(a.amount_cents) filter (where p.status = 'valid'), 0)`)
  }

  /** Invariante 6: situação de pagamento da venda confirmada coerente com o saldo do fiado. */
  salePaymentStatusMismatches() {
    return this.db.execute<{ sale_id: string; payment_status: string; balance_cents: number | null }>(sql`
      select s.id as sale_id, s.payment_status, r.balance_cents
      from sales s
      left join receivables r on r.sale_id = s.id
      where s.status = 'confirmed'
        and ((coalesce(r.balance_cents, 0) = 0 and s.payment_status <> 'paid')
          or (coalesce(r.balance_cents, 0) > 0 and s.payment_status = 'paid'))`)
  }
}

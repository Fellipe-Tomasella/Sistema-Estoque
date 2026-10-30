// Consultas do fechamento do dia D (RN-FEC). Pagamentos e devoluções de valor contam no dia em que aconteceram.
import { eq, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'
import { dailyClosings } from '../../db/schema'

export class ClosingsRepository {
  constructor(private readonly db: DbOrTx) {}

  /** RN-FEC-01: vendas confirmadas no dia e quanto delas ficou no fiado. */
  async salesOfDay(date: string) {
    const [row] = await this.db.execute<{
      count: number
      subtotal_cents: number
      discount_cents: number
      total_cents: number
      fiado_cents: number
    }>(sql`
      select count(*)::int as count,
             coalesce(sum(s.subtotal_cents), 0)::int as subtotal_cents,
             coalesce(sum(s.discount_cents), 0)::int as discount_cents,
             coalesce(sum(s.total_cents), 0)::int as total_cents,
             coalesce(sum(r.original_cents), 0)::int as fiado_cents
      from sales s
      left join receivables r on r.sale_id = s.id
      where s.status = 'confirmed' and s.business_date = ${date}`)
    return row!
  }

  /** Cancelamentos feitos no dia, de vendas de qualquer data (listados à parte). */
  cancellationsOfDay(date: string) {
    return this.db.execute<{
      sale_id: string
      number: number
      sale_date: string
      total_cents: number
      reason: string
    }>(sql`
      select s.id as sale_id, s.number, s.business_date::text as sale_date, s.total_cents, s.cancel_reason as reason
      from returns r
      join sales s on s.id = r.sale_id
      where r.type = 'cancellation' and r.business_date = ${date}
      order by s.number`)
  }

  /** RN-FEC-02: pagamentos válidos do dia, por tipo (na venda, recebimento de fiado, crédito de troca) e forma. */
  paymentsOfDay(date: string) {
    return this.db.execute<{ kind: string; method: string; amount_cents: number }>(sql`
      select kind, method, sum(amount_cents)::int as amount_cents
      from payments
      where status = 'valid' and business_date = ${date}
      group by kind, method`)
  }

  /** RN-FEC-03: devoluções de valor efetivamente feitas no dia, por forma. */
  refundsOfDay(date: string) {
    return this.db.execute<{ method: string; amount_cents: number }>(sql`
      select method, sum(amount_cents)::int as amount_cents
      from refunds
      where status = 'done' and business_date = ${date}
      group by method`)
  }

  /** RN-FEC-07: estornos de recebimento feitos no dia, com a data original afetada. */
  voidsOfDay(date: string, timezone: string) {
    return this.db.execute<{
      payment_id: string
      kind: string
      method: string
      amount_cents: number
      original_date: string
      reason: string
    }>(sql`
      select id as payment_id, kind, method, amount_cents, business_date::text as original_date, void_reason as reason
      from payments
      where status = 'voided' and (voided_at at time zone ${timezone})::date = ${date}
      order by voided_at`)
  }

  async find(date: string, tx: DbOrTx = this.db) {
    const [closing] = await tx.select().from(dailyClosings).where(eq(dailyClosings.businessDate, date))
    return closing
  }

  async upsert(values: typeof dailyClosings.$inferInsert, tx: DbOrTx) {
    await tx
      .insert(dailyClosings)
      .values(values)
      .onConflictDoUpdate({ target: dailyClosings.businessDate, set: values })
  }
}

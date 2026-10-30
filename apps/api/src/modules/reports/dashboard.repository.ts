import { sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'

/** Contagens dos avisos do Início, numa consulta só. */
export class DashboardRepository {
  constructor(private readonly db: DbOrTx) {}

  async counts(today: string) {
    const [row] = await this.db.execute<{
      drafts: number
      shipping_pending: number
      returns_awaiting: number
      refunds_pending: number
      refunds_pending_cents: number
      fiscal_pending: number
      overdue_customers: number
      sales_today: number
      sales_today_cents: number
      received_today_cents: number
    }>(sql`
      select
        (select count(*) from sales where status = 'draft')::int as drafts,
        (select count(*) from sales where status = 'confirmed' and shipping_status = 'pending')::int as shipping_pending,
        (select count(*) from returns where status = 'awaiting_items')::int as returns_awaiting,
        (select count(*) from refunds where status = 'pending')::int as refunds_pending,
        (select coalesce(sum(amount_cents), 0) from refunds where status = 'pending')::int as refunds_pending_cents,
        ((select count(*) from sales s where s.status = 'confirmed' and s.fiscal_requirement in ('required', 'review')
            and not exists (select 1 from fiscal_documents fd
              where fd.sale_id = s.id and fd.status in ('registered', 'cancel_pending')))
          + (select count(*) from fiscal_documents where status = 'cancel_pending'))::int as fiscal_pending,
        (select count(distinct customer_id) from receivables
          where status = 'open' and balance_cents > 0 and due_date < ${today})::int as overdue_customers,
        (select count(*) from sales where status = 'confirmed' and business_date = ${today})::int as sales_today,
        (select coalesce(sum(total_cents), 0) from sales where status = 'confirmed' and business_date = ${today})::int
          as sales_today_cents,
        (select coalesce(sum(amount_cents), 0) from payments
          where status = 'valid' and kind <> 'exchange_credit' and business_date = ${today})::int as received_today_cents`)
    return row!
  }
}

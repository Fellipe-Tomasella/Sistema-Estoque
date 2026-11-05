// Consultas dos relatórios (RN-REL). Todas usam `business_date` (dia da loja) e só vendas confirmadas somam.
import { sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'

export type GroupBy = 'day' | 'week' | 'month'
export interface Period {
  from: string
  to: string
}

export class ReportsRepository {
  constructor(private readonly db: DbOrTx) {}

  /** Totais por dia, semana (segunda a domingo) ou mês. */
  salesByPeriod({ from, to }: Period, groupBy: GroupBy) {
    return this.db.execute<{
      period: string
      count: number
      subtotal_cents: number
      discount_cents: number
      total_cents: number
    }>(sql`
      select to_char(date_trunc(${groupBy}, s.business_date), 'YYYY-MM-DD') as period,
             count(*)::int as count,
             sum(s.subtotal_cents)::int as subtotal_cents,
             sum(s.discount_cents)::int as discount_cents,
             sum(s.total_cents)::int as total_cents
      from sales s
      where s.status = 'confirmed' and s.business_date between ${from} and ${to}
      group by 1
      order by 1`)
  }

  /** Vendas do período com itens; `status` separa válidas e canceladas. */
  salesWithItems({ from, to }: Period, status: 'confirmed' | 'cancelled') {
    return this.db.execute<{
      id: string
      number: number
      business_date: string
      customer_name: string | null
      total_cents: number
      payment_status: string
      cancel_reason: string | null
      items: { productName: string; variantLabel: string; quantity: number; lineTotalCents: number }[]
    }>(sql`
      select s.id, s.number, s.business_date, s.customer_snapshot->>'name' as customer_name, s.total_cents,
             s.payment_status, s.cancel_reason,
             json_agg(json_build_object('productName', si.product_name, 'variantLabel', si.variant_label,
               'quantity', si.quantity, 'lineTotalCents', si.line_total_cents) order by si.id) as items
      from sales s
      join sale_items si on si.sale_id = s.id
      where s.status = ${status} and s.business_date between ${from} and ${to}
      group by s.id
      order by s.number`)
  }

  /** Devoluções parciais e trocas feitas no período (bloco próprio do relatório de vendas). */
  returnsInPeriod({ from, to }: Period) {
    return this.db.execute<{
      id: string
      type: string
      business_date: string
      sale_number: number
      items_value_cents: number
      items: { productName: string; variantLabel: string; quantity: number }[]
    }>(sql`
      select r.id, r.type, r.business_date, s.number as sale_number, r.items_value_cents,
             json_agg(json_build_object('productName', si.product_name, 'variantLabel', si.variant_label,
               'quantity', ri.quantity) order by ri.id) as items
      from returns r
      join sales s on s.id = r.sale_id
      join return_items ri on ri.return_id = r.id
      join sale_items si on si.id = ri.sale_item_id
      where r.type in ('partial_return', 'exchange') and r.business_date between ${from} and ${to}
      group by r.id, s.number
      order by r.business_date, r.created_at`)
  }

  /**
   * Mais e menos vendidos (RN-REL-04): vendido em vendas confirmadas do período, devolvido dessas vendas e líquido.
   * Inclui variações ativas sem venda.
   */
  ranking({ from, to }: Period, level: 'product' | 'variant') {
    const key = level === 'product' ? sql`p.id` : sql`v.id`
    return this.db.execute<{
      product_id: string
      product_name: string
      variant_id: string | null
      color: string | null
      size: string | null
      sold: number
      returned: number
      net: number
    }>(sql`
      select p.id as product_id, p.name as product_name,
             ${level === 'variant' ? sql`v.id` : sql`null`} as variant_id,
             ${level === 'variant' ? sql`min(v.color)` : sql`null`} as color,
             ${level === 'variant' ? sql`min(v.size)` : sql`null`} as size,
             coalesce(sum(si.quantity), 0)::int as sold,
             coalesce(sum(si.returned_qty), 0)::int as returned,
             (coalesce(sum(si.quantity), 0) - coalesce(sum(si.returned_qty), 0))::int as net
      from variants v
      join products p on p.id = v.product_id
      left join (sale_items si join sales s on s.id = si.sale_id
                 and s.status = 'confirmed' and s.business_date between ${from} and ${to})
        on si.variant_id = v.id
      where (v.active and p.active) or si.id is not null
      group by p.id, ${key}`)
  }

  /**
   * Posição do estoque (RN-REL-07): cada variação ativa com saldo, custo e preço (o da variação ou o do produto)
   * e a data da última entrada e da última venda (para ver o que está parado).
   */
  stockPosition() {
    return this.db.execute<{
      variant_id: string
      product_id: string
      product_name: string
      reference: string | null
      category: string | null
      color: string
      size: string
      sku: string | null
      stock_qty: number
      min_stock: number | null
      cost_cents: number | null
      price_cents: number
      last_entry: string | null
      last_sale: string | null
    }>(sql`
      select v.id as variant_id, p.id as product_id, p.name as product_name, p.reference, p.category,
        v.color, v.size, v.sku, v.stock_qty, v.min_stock,
        coalesce(v.cost_cents, p.cost_cents) as cost_cents,
        coalesce(v.price_cents, p.base_price_cents) as price_cents,
        (select max(m.business_date)::text from stock_movements m
          where m.variant_id = v.id and m.type in ('initial', 'purchase_entry')) as last_entry,
        (select max(m.business_date)::text from stock_movements m
          where m.variant_id = v.id and m.type = 'sale') as last_sale
      from variants v
      join products p on p.id = v.product_id
      where v.active and p.active
      order by lower(p.name), lower(v.color), v.size_sort, v.size`)
  }

  /** Fiado em aberto (RN-REL-03): clientes com saldo > 0. */
  openReceivables(today: string) {
    return this.db.execute<{
      customer_id: string
      name: string
      phone: string | null
      open_balance_cents: number
      debts: number
      oldest_date: string
      overdue: boolean
    }>(sql`
      select c.id as customer_id, c.name, c.phone,
             sum(r.balance_cents)::int as open_balance_cents,
             count(*)::int as debts,
             min(r.business_date)::text as oldest_date,
             bool_or(r.due_date is not null and r.due_date < ${today}) as overdue
      from receivables r
      join customers c on c.id = r.customer_id
      where r.status = 'open' and r.balance_cents > 0
      group by c.id
      order by open_balance_cents desc, c.name`)
  }
}

import type { SettingsService } from '../settings/settings.service'
import { formatSaleNumber } from '../sales/sale-view'
import type { GroupBy, Period, ReportsRepository } from './reports.repository'

const sum = <T>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + pick(row), 0)

/** Relatórios pedidos pela dona (RN-REL), sem metas nem indicadores extras. */
export class ReportsService {
  constructor(
    private readonly repo: ReportsRepository,
    private readonly settings: SettingsService,
  ) {}

  /** RN-REL-02: vendas válidas por período; canceladas e devoluções em blocos próprios, sem somar. */
  async sales(period: Period, groupBy: GroupBy) {
    const [groups, sales, cancelled, returns] = await Promise.all([
      this.repo.salesByPeriod(period, groupBy),
      this.repo.salesWithItems(period, 'confirmed'),
      this.repo.salesWithItems(period, 'cancelled'),
      this.repo.returnsInPeriod(period),
    ])
    const groupRows = [...groups]
    return {
      period,
      groupBy,
      totals: {
        count: sum(groupRows, (g) => g.count),
        subtotalCents: sum(groupRows, (g) => g.subtotal_cents),
        discountCents: sum(groupRows, (g) => g.discount_cents),
        totalCents: sum(groupRows, (g) => g.total_cents),
      },
      groups: groupRows.map((g) => ({
        period: g.period,
        count: g.count,
        subtotalCents: g.subtotal_cents,
        discountCents: g.discount_cents,
        totalCents: g.total_cents,
      })),
      sales: [...sales].map((s) => ({
        id: s.id,
        numberLabel: formatSaleNumber(s.number),
        businessDate: s.business_date,
        customerName: s.customer_name,
        totalCents: s.total_cents,
        paymentStatus: s.payment_status,
        items: s.items,
      })),
      cancelled: [...cancelled].map((s) => ({
        id: s.id,
        numberLabel: formatSaleNumber(s.number),
        businessDate: s.business_date,
        totalCents: s.total_cents,
        reason: s.cancel_reason,
      })),
      returns: {
        totalCents: sum([...returns], (r) => r.items_value_cents),
        items: [...returns].map((r) => ({
          id: r.id,
          type: r.type,
          businessDate: r.business_date,
          saleNumberLabel: formatSaleNumber(r.sale_number),
          valueCents: r.items_value_cents,
          items: r.items,
        })),
      },
    }
  }

  /** RN-REL-04: ordenado pelo líquido (vendido − devolvido), nos dois sentidos. */
  async ranking(period: Period, level: 'product' | 'variant', order: 'desc' | 'asc') {
    const rows = [...(await this.repo.ranking(period, level))]
    const direction = order === 'desc' ? -1 : 1
    rows.sort((a, b) => direction * (a.net - b.net) || a.product_name.localeCompare(b.product_name, 'pt-BR'))
    return {
      period,
      level,
      order,
      items: rows.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        variantId: r.variant_id,
        variantLabel: r.variant_id ? `${r.color} / ${r.size}` : null,
        soldQty: r.sold,
        returnedQty: r.returned,
        netQty: r.net,
      })),
    }
  }

  /** RN-REL-03: clientes com saldo, total por cliente e “em atraso”. O detalhe é `/customers/:id/receivables`. */
  async receivables() {
    const rows = [...(await this.repo.openReceivables(await this.settings.businessDate()))]
    return {
      totalOpenCents: sum(rows, (r) => r.open_balance_cents),
      customers: rows.map((r) => ({
        customerId: r.customer_id,
        name: r.name,
        phone: r.phone,
        openBalanceCents: r.open_balance_cents,
        debts: r.debts,
        oldestDate: r.oldest_date,
        overdue: r.overdue,
      })),
    }
  }
}

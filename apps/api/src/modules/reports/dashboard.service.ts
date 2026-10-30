import type { SettingsService } from '../settings/settings.service'
import type { StockService } from '../stock/stock.service'
import type { DashboardRepository } from './dashboard.repository'

/** Início (06 §3.1): avisos que levam às listas filtradas e o resumo de hoje — sem gráficos nem metas. */
export class DashboardService {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly stock: StockService,
    private readonly settings: SettingsService,
  ) {}

  async get() {
    const today = await this.settings.businessDate()
    const [counts, alerts, store] = await Promise.all([
      this.repo.counts(today),
      this.stock.alerts(),
      this.settings.get(),
    ])
    return {
      today,
      alerts: {
        outOfStock: alerts.outCount,
        lowStock: alerts.lowCount,
        drafts: counts.drafts,
        shippingPending: counts.shipping_pending,
        returnsAwaiting: counts.returns_awaiting,
        refundsPending: counts.refunds_pending,
        refundsPendingCents: counts.refunds_pending_cents,
        fiscalPending: counts.fiscal_pending,
        overdueCustomers: counts.overdue_customers,
      },
      todaySummary: {
        salesCount: counts.sales_today,
        salesTotalCents: counts.sales_today_cents,
        receivedCents: counts.received_today_cents,
      },
      fiscalRulesValidated: store.fiscalRulesValidated,
    }
  }
}

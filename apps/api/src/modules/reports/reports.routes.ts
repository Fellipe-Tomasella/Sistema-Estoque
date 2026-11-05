import { Elysia, t } from 'elysia'
import { authPlugin } from '../../shared/auth.plugin'
import { csvMoney, toCsv } from '../../shared/csv'
import { OneOf } from '../../shared/schemas'

const DateString = t.String({ format: 'date' })
const PeriodQuery = { from: DateString, to: DateString }
const SalesQuery = t.Object({ ...PeriodQuery, groupBy: t.Optional(OneOf(['day', 'week', 'month'])) })
const RankingQuery = t.Object({
  ...PeriodQuery,
  level: t.Optional(OneOf(['product', 'variant'])),
  order: t.Optional(OneOf(['desc', 'asc'])),
})
const DateParams = t.Object({ date: DateString })
const StockQuery = t.Object({
  status: t.Optional(OneOf(['all', 'in', 'out', 'low'])),
  category: t.Optional(t.String({ maxLength: 60 })),
  q: t.Optional(t.String({ maxLength: 100 })),
})

function csvResponse(set: { headers: Record<string, string | number> }, fileName: string, content: string) {
  set.headers['content-type'] = 'text/csv; charset=utf-8'
  set.headers['content-disposition'] = `attachment; filename="${fileName}"`
  return content
}

export const reportsRoutes = new Elysia()
  .use(authPlugin)
  .guard({ auth: true })
  .get('/dashboard', ({ services }) => services.dashboard.get())
  .get('/reports/sales', ({ query, services }) => services.reports.sales(query, query.groupBy ?? 'day'), {
    query: SalesQuery,
  })
  .get('/reports/receivables', ({ services }) => services.reports.receivables())
  .get(
    '/reports/products-ranking',
    ({ query, services }) => services.reports.ranking(query, query.level ?? 'product', query.order ?? 'desc'),
    { query: RankingQuery },
  )
  // RN-REL-06: cada relatório em CSV.
  .get(
    '/reports/sales.csv',
    async ({ query, services, set }) => {
      const report = await services.reports.sales(query, query.groupBy ?? 'day')
      const csv = toCsv(
        [
          { header: 'Período', value: (g) => g.period },
          { header: 'Vendas', value: (g) => g.count },
          { header: 'Subtotal', value: (g) => csvMoney(g.subtotalCents) },
          { header: 'Descontos', value: (g) => csvMoney(g.discountCents) },
          { header: 'Total', value: (g) => csvMoney(g.totalCents) },
        ],
        report.groups,
      )
      return csvResponse(set, `vendas-${query.from}-a-${query.to}.csv`, csv)
    },
    { query: SalesQuery },
  )
  .get('/reports/stock', ({ query, services }) => services.reports.stock(query), { query: StockQuery })
  .get(
    '/reports/stock.csv',
    async ({ query, services, set }) => {
      const report = await services.reports.stock(query)
      const money = (cents: number | null) => (cents === null ? '' : csvMoney(cents))
      const csv = toCsv(
        [
          { header: 'Produto', value: (r) => r.productName },
          { header: 'Referência', value: (r) => r.reference },
          { header: 'Categoria', value: (r) => r.category },
          { header: 'Cor', value: (r) => r.color },
          { header: 'Tamanho', value: (r) => r.size },
          { header: 'SKU', value: (r) => r.sku },
          { header: 'Saldo', value: (r) => r.stockQty },
          { header: 'Mínimo', value: (r) => r.minStock },
          { header: 'Custo', value: (r) => money(r.costCents) },
          { header: 'Preço', value: (r) => money(r.priceCents) },
          { header: 'Valor a custo', value: (r) => money(r.stockCostCents) },
          { header: 'Valor a preço de venda', value: (r) => money(r.stockValueCents) },
          { header: 'Última entrada', value: (r) => r.lastEntry },
          { header: 'Última venda', value: (r) => r.lastSale },
        ],
        report.rows,
      )
      return csvResponse(set, 'estoque.csv', csv)
    },
    { query: StockQuery },
  )
  .get('/reports/receivables.csv', async ({ services, set }) => {
    const report = await services.reports.receivables()
    const csv = toCsv(
      [
        { header: 'Cliente', value: (c) => c.name },
        { header: 'Telefone', value: (c) => c.phone },
        { header: 'Em aberto', value: (c) => csvMoney(c.openBalanceCents) },
        { header: 'Dívidas', value: (c) => c.debts },
        { header: 'Mais antiga', value: (c) => c.oldestDate },
        { header: 'Em atraso', value: (c) => (c.overdue ? 'sim' : 'não') },
      ],
      report.customers,
    )
    return csvResponse(set, 'fiado-em-aberto.csv', csv)
  })
  .get(
    '/reports/products-ranking.csv',
    async ({ query, services, set }) => {
      const report = await services.reports.ranking(query, query.level ?? 'product', query.order ?? 'desc')
      const csv = toCsv(
        [
          { header: 'Produto', value: (r) => r.productName },
          { header: 'Variação', value: (r) => r.variantLabel },
          { header: 'Vendidas', value: (r) => r.soldQty },
          { header: 'Devolvidas', value: (r) => r.returnedQty },
          { header: 'Líquido', value: (r) => r.netQty },
        ],
        report.items,
      )
      return csvResponse(set, `mais-vendidos-${query.from}-a-${query.to}.csv`, csv)
    },
    { query: RankingQuery },
  )
  .get('/closings/:date', ({ params, services }) => services.closings.get(params.date), { params: DateParams })
  .put('/closings/:date', ({ params, body, services, user }) => services.closings.save(params.date, body, user.id), {
    params: DateParams,
    body: t.Object({
      countedCashCents: t.Integer({ minimum: 0, maximum: 100_000_000 }),
      notes: t.Optional(t.Nullable(t.String({ maxLength: 1000 }))),
    }),
  })

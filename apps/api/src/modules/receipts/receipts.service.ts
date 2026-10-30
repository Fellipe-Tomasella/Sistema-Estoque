import { formatBRL } from '@estoque/shared'
import type { Content } from 'pdfmake/interfaces'
import type { StoreSettings } from '../../db/schema'
import { BusinessRuleError } from '../../shared/errors'
import type { ReceivableReceiptsService } from '../receivables/receivable-receipts.service'
import type { SalesService } from '../sales/sales.service'
import type { SettingsService } from '../settings/settings.service'
import { formatDateTime, NOT_FISCAL, renderPdf, row } from './pdf'

const METHOD_NAMES: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  exchange_credit: 'Crédito de troca',
}

function storeHeader(store: StoreSettings): Content[] {
  const details = [store.legalName, store.cnpj && `CNPJ ${store.cnpj}`, store.address, store.phone, store.email].filter(
    Boolean,
  )
  return [
    { text: store.storeName, style: 'title' },
    ...(details.length ? [{ text: details.join(' · '), style: 'muted' }] : []),
    { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 363, y2: 4, lineWidth: 0.5 }], margin: [0, 0, 0, 8] },
  ]
}

function itemsTable(
  items: {
    productName: string
    variantLabel: string
    quantity: number
    unitPriceCents: number
    lineSubtotalCents: number
  }[],
): Content {
  const header = ['Item', 'Qtd', 'Preço', 'Total'].map((text) => ({ text, bold: true }))
  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto'],
      body: [
        header,
        ...items.map((item) => [
          { text: `${item.productName} — ${item.variantLabel}` },
          { text: String(item.quantity), alignment: 'center' as const },
          { text: formatBRL(item.unitPriceCents), alignment: 'right' as const },
          { text: formatBRL(item.lineSubtotalCents), alignment: 'right' as const },
        ]),
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 6],
  }
}

/** Comprovantes em PDF (RN-VEN-14). Compartilhamento é manual: a dona baixa e envia. */
export class ReceiptsService {
  constructor(
    private readonly sales: SalesService,
    private readonly settings: SettingsService,
    private readonly receivableReceipts: ReceivableReceiptsService,
  ) {}

  /** RN-FIA-08: cliente, data, valor, forma, dívidas abatidas e saldo restante. */
  async receivableReceiptPdf(paymentId: string) {
    const { content } = await this.receivableReceiptContent(paymentId)
    return { fileName: `recebimento-${paymentId.slice(0, 8)}.pdf`, pdf: await renderPdf(content) }
  }

  async receivableReceiptContent(paymentId: string) {
    const receipt = await this.receivableReceipts.view(paymentId)
    const store = await this.settings.get()
    const content: Content[] = [
      ...storeHeader(store),
      { text: 'Comprovante de recebimento', bold: true, fontSize: 11 },
      { text: formatDateTime(receipt.receivedAt, store.timezone), style: 'muted', margin: [0, 0, 0, 4] },
      ...(receipt.status === 'voided'
        ? [{ text: `RECEBIMENTO ESTORNADO: ${receipt.voidReason}`, style: 'alert', margin: [0, 2, 0, 4] } as Content]
        : []),
      { text: `Cliente: ${receipt.customer.name}`, margin: [0, 0, 0, 6] },
      row('Valor recebido', formatBRL(receipt.amountCents), 'total'),
      row('Forma', METHOD_NAMES[receipt.method] ?? receipt.method),
      { text: 'Dívidas abatidas', bold: true, margin: [0, 8, 0, 2] },
      ...receipt.allocations.map((a) => row(a.description, formatBRL(a.amountCents))),
      row('Saldo restante em aberto', formatBRL(receipt.openBalanceCents), 'total'),
      {
        text: 'Comprovante de recebimento — não é documento fiscal.',
        bold: true,
        alignment: 'center',
        margin: [0, 14, 0, 0],
      },
    ]
    return { content }
  }

  async salePdf(saleId: string): Promise<{ fileName: string; pdf: Buffer }> {
    const { number, content } = await this.saleContent(saleId)
    return { fileName: `comprovante-${String(number).padStart(6, '0')}.pdf`, pdf: await renderPdf(content) }
  }

  /** Conteúdo do comprovante de venda (separado da renderização para poder ser conferido nos testes). */
  async saleContent(saleId: string) {
    const sale = await this.sales.view(saleId)
    if (sale.status === 'draft' || !sale.confirmedAt) throw new BusinessRuleError('Rascunho não tem comprovante.')
    const store = await this.settings.get()

    const paidCents = sale.paidCents
    const openCents = sale.receivable?.balanceCents ?? 0
    const content: Content[] = [
      ...storeHeader(store),
      { text: `Comprovante de venda ${sale.numberLabel}`, bold: true, fontSize: 11 },
      { text: formatDateTime(sale.confirmedAt, store.timezone), style: 'muted', margin: [0, 0, 0, 4] },
      ...(sale.status === 'cancelled'
        ? [{ text: 'VENDA CANCELADA', style: 'alert', margin: [0, 2, 0, 4] } as Content]
        : []),
      ...(sale.customer ? [{ text: `Cliente: ${sale.customer.name}`, margin: [0, 0, 0, 6] } as Content] : []),
      itemsTable(sale.items),
      row('Subtotal', formatBRL(sale.subtotalCents)),
      ...(sale.discountCents > 0 ? [row('Desconto', `− ${formatBRL(sale.discountCents)}`)] : []),
      row('Total', formatBRL(sale.totalCents), 'total'),
      { text: 'Pagamentos', bold: true, margin: [0, 8, 0, 2] },
      ...sale.payments
        .filter((p) => p.status === 'valid' && p.kind !== 'receivable_receipt')
        .map((p) => row(METHOD_NAMES[p.method] ?? p.method, formatBRL(p.amountCents))),
      ...(sale.receivable ? [row('Fiado', formatBRL(sale.receivable.originalCents))] : []),
      // Nunca mostrar como quitada uma venda com saldo em aberto.
      ...(sale.receivable
        ? [
            row('Valor pago', formatBRL(paidCents + sale.receivable.paidCents)),
            row('Saldo em aberto', formatBRL(openCents), 'total'),
            ...(sale.receivable.dueDate
              ? [row('Pagamento combinado para', sale.receivable.dueDate.split('-').reverse().join('/'))]
              : []),
          ]
        : []),
      ...(store.receiptFooter ? [{ text: store.receiptFooter, margin: [0, 10, 0, 0] } as Content] : []),
      { text: NOT_FISCAL, bold: true, alignment: 'center', margin: [0, 14, 0, 0] },
    ]
    return { number: sale.number, content }
  }
}

import { formatBRL } from '@estoque/shared'
import type { WebOrder, WebOrderItem } from '../../db/schema'
import type { MailMessage } from '../../shared/mailer'

interface Context {
  storeTitle: string
  /** Endereço do painel (APP_ORIGIN), para o link do pedido. */
  origin: string
  storeWhatsapp: string | null
}

const lines = (items: WebOrderItem[]) =>
  items
    .map(
      (i) =>
        `- ${i.quantity}x ${i.productName} (${i.variantLabel}) — ${i.unitPriceCents === null ? 'Consulte' : formatBRL(i.unitPriceCents * i.quantity)}`,
    )
    .join('\n')

const total = (order: WebOrder) =>
  `${formatBRL(order.totalCents)}${order.hasHiddenPrices ? ' + itens a consultar' : ''}`

const phone = (digits: string) => digits.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')

/** Aviso para a vendedora (RN-LOJ-06): quem é, como falar e o que pediu. */
export function sellerEmail(order: WebOrder, items: WebOrderItem[], ctx: Context, to: string): MailMessage {
  return {
    to,
    subject: `Novo pedido do site nº ${order.number} — ${order.customerName}`,
    text: [
      `Chegou um pedido pelo site da ${ctx.storeTitle}.`,
      '',
      `Cliente: ${order.customerName}`,
      `WhatsApp: ${phone(order.whatsapp)} — https://wa.me/${order.whatsapp}`,
      order.email ? `E-mail: ${order.email}` : null,
      order.city ? `Cidade: ${order.city}` : null,
      order.notes ? `Observação: ${order.notes}` : null,
      '',
      'Peças:',
      lines(items),
      '',
      `Total: ${total(order)}`,
      '',
      `Ver no sistema: ${ctx.origin}/pedidos?id=${order.id}`,
      '',
      'O estoque não foi baixado. Combine com a cliente e use “Virar venda” no sistema.',
    ]
      .filter((line) => line !== null)
      .join('\n'),
  }
}

/** Confirmação para a cliente, quando ela deixou o e-mail (RN-LOJ-06). Não é documento fiscal. */
export function customerEmail(order: WebOrder, items: WebOrderItem[], ctx: Context): MailMessage {
  return {
    to: order.email!,
    subject: `Recebemos seu pedido nº ${order.number} — ${ctx.storeTitle}`,
    text: [
      `Olá, ${order.customerName.split(' ')[0]}!`,
      '',
      `Recebemos seu pedido na ${ctx.storeTitle}. A vendedora vai entrar em contato pelo WhatsApp para combinar pagamento e entrega.`,
      '',
      'Peças:',
      lines(items),
      '',
      `Total: ${total(order)}`,
      ctx.storeWhatsapp ? `\nSe preferir, fale com a loja: https://wa.me/${ctx.storeWhatsapp}` : null,
      '',
      'Este e-mail não é documento fiscal.',
    ]
      .filter((line) => line !== null)
      .join('\n'),
  }
}

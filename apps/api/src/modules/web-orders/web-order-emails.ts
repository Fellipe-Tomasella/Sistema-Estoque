import { formatBRL } from '@estoque/shared'
import type { WebOrder, WebOrderItem } from '../../db/schema'
import type { MailMessage } from '../../shared/mailer'
import { type Html, html, raw } from '../storefront/site/html'

export interface EmailContext {
  storeTitle: string
  /** Endereço do sistema (APP_ORIGIN): link do pedido no painel e da loja. */
  origin: string
  storeWhatsapp: string | null
  accentColor: string
  /** Caminho da loja (`/jooliv-lingeries`), quando configurado. */
  storePath: string | null
  /** Quem recebe os pedidos: a cliente responde direto para ela. */
  sellerEmail: string | null
}

const money = (item: WebOrderItem) =>
  item.unitPriceCents === null ? 'Consulte' : formatBRL(item.unitPriceCents * item.quantity)
const total = (order: WebOrder) =>
  `${formatBRL(order.totalCents)}${order.hasHiddenPrices ? ' + itens a consultar' : ''}`
const phone = (digits: string) => digits.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
const firstName = (name: string) => name.split(' ')[0]

const textLines = (items: WebOrderItem[]) =>
  items.map((i) => `- ${i.quantity}x ${i.productName} (${i.variantLabel}) — ${money(i)}`).join('\n')

/** Moldura dos e-mails: tabelas e estilos inline (é o que os leitores de e-mail entendem). */
function frame(ctx: EmailContext, preheader: string, content: Html) {
  const accent = ctx.accentColor
  return html`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${ctx.storeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background:#f6f2f4;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f1b24">
        <span style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</span>
        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="background:#f6f2f4;padding:24px 12px"
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 2px 12px rgba(31,27,36,.06)"
              >
                <tr>
                  <td style="background:${raw(accent)};padding:28px 32px;text-align:center">
                    <p style="margin:0;font:600 26px Georgia,'Times New Roman',serif;color:#ffffff;letter-spacing:.3px">
                      ${ctx.storeTitle}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px 8px">${content}</td>
                </tr>
                <tr>
                  <td
                    style="padding:16px 32px 28px;border-top:1px solid #f0e8ec;color:#8a7f87;font-size:12px;line-height:1.5;text-align:center"
                  >
                    ${ctx.storePath ? html`<a href="${ctx.origin}${ctx.storePath}" style="color:${raw(accent)};text-decoration:none;font-weight:600">Visite a loja</a><br />` : ''}
                    Este e-mail não é documento fiscal.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`
}

function itemsTable(items: WebOrderItem[], order: WebOrder, accent: string) {
  return html`<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="margin:16px 0;border:1px solid #f0e8ec;border-radius:12px;border-collapse:separate"
  >
    ${items.map(
      (i, n) =>
        html`<tr>
          <td style="padding:12px 14px;${n ? 'border-top:1px solid #f0e8ec;' : ''}font-size:14px">
            <strong>${i.quantity}× ${i.productName}</strong><br /><span style="color:#8a7f87">${i.variantLabel}</span>
          </td>
          <td
            align="right"
            style="padding:12px 14px;${n ? 'border-top:1px solid #f0e8ec;' : ''}font-size:14px;white-space:nowrap"
          >
            ${money(i)}
          </td>
        </tr>`,
    )}
    <tr>
      <td style="padding:14px;border-top:1px solid #f0e8ec;font-size:15px"><strong>Total</strong></td>
      <td align="right" style="padding:14px;border-top:1px solid #f0e8ec;font-size:17px;color:${raw(accent)}">
        <strong>${total(order)}</strong>
      </td>
    </tr>
  </table>`
}

const button = (href: string, label: string, color: string) =>
  html`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0">
    <tr>
      <td style="border-radius:999px;background:${raw(color)}">
        <a
          href="${href}"
          style="display:inline-block;padding:13px 26px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:999px"
          >${label}</a
        >
      </td>
    </tr>
  </table>`

/** Aviso para a vendedora (RN-LOJ-06): quem é, como falar e o que pediu. */
export function sellerEmail(order: WebOrder, items: WebOrderItem[], ctx: EmailContext, to: string): MailMessage {
  const wa = `https://wa.me/${order.whatsapp}?text=${encodeURIComponent(
    `Olá, ${firstName(order.customerName)}! Recebi seu pedido nº ${order.number} na ${ctx.storeTitle}.`,
  )}`
  const panel = `${ctx.origin}/pedidos?id=${order.id}`
  const content = html` <p
      style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${raw(ctx.accentColor)}"
    >
      Novo pedido nº ${order.number}
    </p>
    <h1 style="margin:0 0 12px;font:600 24px Georgia,serif">${order.customerName} quer comprar!</h1>
    <p style="margin:0 0 4px;font-size:15px">📱 <a href="${wa}" style="color:#1f1b24">${phone(order.whatsapp)}</a></p>
    ${order.email ? html`<p style="margin:0 0 4px;font-size:15px">✉️ ${order.email}</p>` : ''}
    ${order.city ? html`<p style="margin:0 0 4px;font-size:15px">📍 ${order.city}</p>` : ''}
    ${order.notes ? html`<p style="margin:12px 0 0;padding:12px 14px;background:#faf6f8;border-radius:10px;font-size:14px">“${order.notes}”</p>` : ''}
    ${itemsTable(items, order, ctx.accentColor)} ${button(wa, 'Chamar no WhatsApp', '#25d366')}
    ${button(panel, 'Ver pedido no sistema', ctx.accentColor)}
    <p style="margin:12px 0 16px;font-size:13px;color:#8a7f87">
      O estoque ainda não foi baixado. Combine com a cliente e use “Virar venda” no sistema.
    </p>`
  return {
    to,
    fromName: ctx.storeTitle,
    subject: `🛍️ Novo pedido nº ${order.number} — ${order.customerName}`,
    html: frame(ctx, `${order.customerName} fez um pedido de ${total(order)}`, content).value,
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
      textLines(items),
      '',
      `Total: ${total(order)}`,
      '',
      `Ver no sistema: ${panel}`,
      '',
      'O estoque não foi baixado. Combine com a cliente e use “Virar venda” no sistema.',
    ]
      .filter((line) => line !== null)
      .join('\n'),
  }
}

/** Confirmação para a cliente, quando ela deixou o e-mail (RN-LOJ-06). Não é documento fiscal. */
export function customerEmail(order: WebOrder, items: WebOrderItem[], ctx: EmailContext): MailMessage {
  const wa = ctx.storeWhatsapp
    ? `https://wa.me/${ctx.storeWhatsapp}?text=${encodeURIComponent(`Olá! Fiz o pedido nº ${order.number} pelo site.`)}`
    : null
  const content = html` <h1 style="margin:0 0 8px;font:600 26px Georgia,serif">
      Oi, ${firstName(order.customerName)}! 💖
    </h1>
    <p style="margin:0 0 4px;font-size:16px;line-height:1.55">
      Recebemos seu <strong>pedido nº ${order.number}</strong>. Que alegria ter você por aqui!
    </p>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#4a4150">
      Em breve a vendedora vai chamar você no WhatsApp para combinar o pagamento e a entrega.
    </p>
    ${itemsTable(items, order, ctx.accentColor)} ${wa ? button(wa, 'Falar com a loja no WhatsApp', '#25d366') : ''}
    <p style="margin:12px 0 16px;font-size:13px;color:#8a7f87">Ficou alguma dúvida? É só responder este e-mail.</p>`
  return {
    to: order.email!,
    fromName: ctx.storeTitle,
    replyTo: ctx.sellerEmail ?? undefined,
    subject: `Recebemos seu pedido nº ${order.number} 💖 ${ctx.storeTitle}`,
    html: frame(ctx, `Seu pedido nº ${order.number} foi recebido. A loja vai chamar você no WhatsApp.`, content).value,
    text: [
      `Olá, ${firstName(order.customerName)}!`,
      '',
      `Recebemos seu pedido na ${ctx.storeTitle}. A vendedora vai entrar em contato pelo WhatsApp para combinar pagamento e entrega.`,
      '',
      'Peças:',
      textLines(items),
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

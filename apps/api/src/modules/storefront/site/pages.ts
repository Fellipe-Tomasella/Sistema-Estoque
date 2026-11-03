import { formatBRL, slugify } from '@estoque/shared'
import type { StorefrontSettings } from '../../../db/schema'
import type { PublicProduct } from '../storefront.service'
import { type Html, html, json, raw } from './html'
import { SITE_CSS } from './site-css'
import { BAG_SCRIPT, CART_SCRIPT, PRODUCT_SCRIPT } from './site-script'

export interface SiteContext {
  settings: StorefrontSettings
  title: string
  /** Endereço público absoluto do sistema (APP_ORIGIN), para links e prévia no WhatsApp. */
  origin: string
  preview: boolean
}

const base = (ctx: SiteContext) => `/${ctx.settings.slug}`
export const productPath = (ctx: SiteContext, p: PublicProduct) => `${base(ctx)}/p/${p.id}/${slugify(p.name)}`

const price = (p: PublicProduct) =>
  p.priceCents === null ? 'Consulte' : `${p.priceFrom ? 'a partir de ' : ''}${formatBRL(p.priceCents)}`

/** Preço com o “de” riscado quando houver (RN-LOJ-09). */
const priceHtml = (p: PublicProduct) =>
  p.compareAtCents ? html`<s class="was">${formatBRL(p.compareAtCents)}</s> ${price(p)}` : html`${price(p)}`

export const whatsappLink = (ctx: SiteContext, text: string) =>
  ctx.settings.whatsapp ? `https://wa.me/${ctx.settings.whatsapp}?text=${encodeURIComponent(text)}` : null

function layout(
  ctx: SiteContext,
  page: { title: string; description?: string | null; image?: string | null; path: string; body: Html },
) {
  const url = `${ctx.origin}${page.path}`
  const description = page.description ?? ctx.settings.tagline ?? ctx.title
  const chat = whatsappLink(ctx, `Olá! Vim pelo site da ${ctx.title}.`)
  return html`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${page.title}</title>
        <meta name="description" content="${description}" />
        <link rel="canonical" href="${url}" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="${ctx.title}" />
        <meta property="og:title" content="${page.title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:url" content="${url}" />
        ${page.image ? html`<meta property="og:image" content="${ctx.origin}${page.image}" />` : ''}
        ${ctx.preview ? html`<meta name="robots" content="noindex" />` : ''}
        <meta name="theme-color" content="${ctx.settings.accentColor}" />
        <style>
          :root{--accent:${raw(ctx.settings.accentColor)}}${raw(SITE_CSS)}
        </style>
      </head>
      <body data-store="${ctx.settings.slug}">
        ${ctx.preview ? html`<div class="preview">Pré-visualização: o site ainda não está no ar. Só você (logada) vê esta página.</div>` : ''}
        <header class="top">
          <div class="wrap">
            <a class="brand" href="${base(ctx)}">${ctx.title}</a>
            <a class="bag" href="${base(ctx)}/sacola" aria-label="Sacola">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7Zm3 0a3 3 0 0 1 6 0" /></svg>
              <span data-bag-count hidden></span>
            </a>
          </div>
        </header>
        <main class="wrap">${page.body}</main>
        <footer class="foot">
          <div class="wrap">
            <p class="brand-small">${ctx.title}</p>
            <p>
              ${chat ? html`<a href="${chat}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
              ${ctx.settings.instagram ? html`<a href="https://instagram.com/${ctx.settings.instagram}" target="_blank" rel="noopener">Instagram @${ctx.settings.instagram}</a>` : ''}
              <a href="${base(ctx)}/privacidade">Privacidade</a>
            </p>
          </div>
        </footer>
        ${
          chat
            ? html`<a class="wa-float" href="${chat}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm4.6 12.6c-.2.6-1.1 1.1-1.6 1.2-.4 0-.9.2-3-.6-2.5-1-4.1-3.6-4.2-3.7-.1-.2-1-1.3-1-2.5s.6-1.8.9-2.1c.2-.2.5-.3.6-.3h.5c.1 0 .4 0 .5.4l.8 1.8c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.8-.1 1.4Z"
                  />
                </svg>
              </a>`
            : ''
        }
        <script>
          ${raw(BAG_SCRIPT)}
        </script>
      </body>
      </body>
    </html>`
}

function card(ctx: SiteContext, p: PublicProduct) {
  const cover = p.images[0]
  return html`<li class="card${p.soldOut ? ' sold' : ''}">
    <a href="${productPath(ctx, p)}">
      <div class="ph">
        ${cover ? html`<img src="${cover.thumbUrl}" alt="${p.name}" loading="lazy" width="400" height="500" />` : html`<span>${p.name.slice(0, 1)}</span>`}
        ${p.soldOut ? html`<em class="tag">Esgotado</em>` : ''}
      </div>
      <p class="name">${p.name}</p>
      <p class="price">${priceHtml(p)}</p>
    </a>
  </li>`
}

export function homePage(ctx: SiteContext, products: PublicProduct[], category: string | null) {
  const categories = [...new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))].sort()
  const shown = category ? products.filter((p) => p.category === category) : products
  const link = (c: string | null) => (c ? `${base(ctx)}?categoria=${encodeURIComponent(c)}` : base(ctx))
  const body = html` <section class="hero">
      <h1>${ctx.title}</h1>
      ${ctx.settings.tagline ? html`<p>${ctx.settings.tagline}</p>` : ''}
    </section>
    ${
      categories.length > 1
        ? html`<nav class="chips" aria-label="Categorias">
            <a href="${link(null)}" class="${category ? '' : 'on'}">Tudo</a>
            ${categories.map((c) => html`<a href="${link(c)}" class="${c === category ? 'on' : ''}">${c}</a>`)}
          </nav>`
        : ''
    }
    ${
      shown.length
        ? html`<ul class="grid">
            ${shown.map((p) => card(ctx, p))}
          </ul>`
        : html`<p class="empty">Nenhuma peça por aqui ainda. Volte em breve!</p>`
    }
    ${
      ctx.settings.about
        ? html`<section class="about">
            <h2>Sobre</h2>
            ${ctx.settings.about.split(/\n{2,}/).map((t) => html`<p>${t}</p>`)}
          </section>`
        : ''
    }`
  return layout(ctx, {
    title: category ? `${category} · ${ctx.title}` : ctx.title,
    image: products.find((p) => p.images[0])?.images[0]?.largeUrl,
    path: link(category),
    body,
  })
}

export function productPage(ctx: SiteContext, p: PublicProduct) {
  const url = `${ctx.origin}${productPath(ctx, p)}`
  const cover = p.images[0]
  // começa na cor da foto de capa (se ela for de uma cor), para foto e tamanhos combinarem
  const firstColor = p.colors.find((c) => c.color === cover?.color)?.color ?? p.colors[0]?.color
  const ask = whatsappLink(ctx, `Olá! Tenho interesse em: ${p.name}\n${url}`)
  const body = html` <nav class="crumbs">
      <a href="${base(ctx)}">Início</a
      >${p.category ? html` / <a href="${base(ctx)}?categoria=${encodeURIComponent(p.category)}">${p.category}</a>` : ''}
    </nav>
    <article class="product">
      <div class="gallery">
        <div class="main ph">
          ${cover ? html`<img id="main-img" src="${cover.largeUrl}" alt="${p.name}" width="${cover.width}" height="${cover.height}" />` : html`<span>${p.name.slice(0, 1)}</span>`}
        </div>
        ${p.images.length > 1 ? html`<div class="thumbs" id="thumbs">${p.images.map((img, i) => html`<button type="button" data-large="${img.largeUrl}" data-thumb="${img.thumbUrl}" data-color="${img.color ?? ''}" class="${i === 0 ? 'on' : ''}" aria-label="Foto ${i + 1}"><img src="${img.thumbUrl}" alt="" loading="lazy" /></button>`)}</div>` : ''}
      </div>
      <div class="info">
        <h1>${p.name}</h1>
        <p class="price big">${priceHtml(p)}</p>
        ${p.soldOut ? html`<p class="warn">Esgotado no momento.</p>` : ''}
        ${
          p.colors.length
            ? html`<div class="opts" id="opts">
                <p class="label">Cor</p>
                <div class="chips" id="colors">
                  ${p.colors.map((c) => html`<button type="button" data-color="${c.color}" class="${c.color === firstColor ? 'on' : ''}">${c.color}</button>`)}
                </div>
                <p class="label">Tamanho</p>
                <div class="chips" id="sizes"></div>
              </div>`
            : ''
        }
        ${
          !p.soldOut
            ? html`<button type="button" class="btn wide" id="add" disabled>Escolha o tamanho</button>
                <p id="added" class="ok" hidden>
                  Adicionada à sacola. <a href="${base(ctx)}/sacola">Ver sacola e finalizar</a>
                </p>`
            : ''
        }
        ${ask ? html`<a class="btn btn-ghost wide" id="ask" href="${ask}" target="_blank" rel="noopener">Falar no WhatsApp sobre esta peça</a>` : ''}
        ${p.description ? html`<div class="desc">${p.description.split(/\n{2,}/).map((t) => html`<p>${t}</p>`)}</div>` : ''}
      </div>
    </article>
    <script type="application/json" id="product-data">
      ${json({ name: p.name, url, colors: p.colors, whatsapp: ctx.settings.whatsapp, priceCents: p.priceCents, image: cover?.thumbUrl ?? null })}
    </script>
    <script>
      ${raw(PRODUCT_SCRIPT)}
    </script>`
  return layout(ctx, {
    title: `${p.name} · ${ctx.title}`,
    description: p.description?.slice(0, 160) ?? `${p.name} — ${price(p)}`,
    image: cover?.largeUrl,
    path: productPath(ctx, p),
    body,
  })
}

/** Sacola e finalizar pedido (docs/11 §4): itens do navegador + formulário curto; sem pagamento on-line. */
export function cartPage(ctx: SiteContext) {
  const body = html`<section class="hero small"><h1>Sua sacola</h1></section>
    <div class="cart">
      <div>
        <ul id="bag-items" class="bag-list"></ul>
        <p id="bag-empty" class="empty" hidden>Sua sacola está vazia. <a href="${base(ctx)}">Ver as peças</a></p>
        <p class="bag-total">Total <strong id="bag-total"></strong></p>
      </div>
      <form id="checkout" class="checkout" hidden>
        <h2>Finalizar pedido</h2>
        <p class="muted">
          Sem pagamento agora: a vendedora entra em contato pelo WhatsApp para combinar pagamento e entrega.
        </p>
        <label>Nome<input name="name" required minlength="2" maxlength="120" autocomplete="name" /></label>
        <label
          >WhatsApp<input name="whatsapp" required inputmode="tel" autocomplete="tel" placeholder="(11) 99999-8888"
        /></label>
        <label>E-mail (opcional)<input name="email" type="email" autocomplete="email" /></label>
        <label>Cidade (opcional)<input name="city" maxlength="100" autocomplete="address-level2" /></label>
        <label
          >${ctx.settings.notesLabel ?? 'Observação'}${ctx.settings.notesRequired ? '' : ' (opcional)'}<textarea
            name="notes"
            rows="2"
            maxlength="1000"
            ${ctx.settings.notesRequired ? raw('required') : ''}
          ></textarea>
        </label>
        ${ctx.settings.checkoutNotice ? html`<p class="notice">${ctx.settings.checkoutNotice}</p>` : ''}
        <label class="hp" aria-hidden="true">Site<input name="website" tabindex="-1" autocomplete="off" /></label>
        <label class="check"
          ><input type="checkbox" name="consent" required /> Li e aceito a
          <a href="${base(ctx)}/privacidade" target="_blank">política de privacidade</a>.</label
        >
        <p id="form-error" class="warn" hidden></p>
        <button type="submit" class="btn wide">Enviar pedido</button>
      </form>
      <div id="done" class="done" hidden>
        <h2>Pedido <span data-number></span> recebido!</h2>
        <p>Obrigada! A vendedora vai entrar em contato pelo WhatsApp para combinar pagamento e entrega.</p>
        ${ctx.settings.whatsapp ? html`<a class="btn wide" data-wa href="#" target="_blank" rel="noopener">Enviar o pedido no WhatsApp</a>` : ''}
        <p><a href="${base(ctx)}">Continuar vendo as peças</a></p>
      </div>
    </div>
    <script type="application/json" id="cart-data">
      ${json({ whatsapp: ctx.settings.whatsapp })}
    </script>
    <script>
      ${raw(CART_SCRIPT)}
    </script>`
  return layout(ctx, { title: `Sacola · ${ctx.title}`, path: `${base(ctx)}/sacola`, body })
}

/** Política de privacidade (LGPD, docs/11 §6): o que é guardado e para quê. */
export function privacyPage(ctx: SiteContext) {
  return layout(ctx, {
    title: `Privacidade · ${ctx.title}`,
    path: `${base(ctx)}/privacidade`,
    body: html`<section class="about text-left">
      <h1>Política de privacidade</h1>
      <p>
        Quando você envia um pedido, a ${ctx.title} guarda seu nome, WhatsApp e, se informar, e-mail, cidade e
        observação, junto com as peças escolhidas. Esses dados servem só para falar com você sobre o pedido e registrar
        a venda.
      </p>
      <p>
        Não usamos cookies de rastreamento nem compartilhamos seus dados com terceiros. A sacola fica guardada apenas no
        seu navegador até você enviar o pedido.
      </p>
      <p>Para corrigir ou apagar seus dados, fale com a loja${ctx.settings.whatsapp ? ' pelo WhatsApp' : ''}.</p>
    </section>`,
  })
}

export function notFoundPage(ctx: SiteContext) {
  return layout(ctx, {
    title: `Página não encontrada · ${ctx.title}`,
    path: base(ctx),
    body: html`<section class="hero">
      <h1>Peça não encontrada</h1>
      <p>Ela pode ter saído do site.</p>
      <p><a class="btn" href="${base(ctx)}">Ver todas as peças</a></p>
    </section>`,
  })
}

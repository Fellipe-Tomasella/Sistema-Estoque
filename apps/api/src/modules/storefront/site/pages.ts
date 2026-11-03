import { formatBRL, slugify } from '@estoque/shared'
import type { StorefrontSettings } from '../../../db/schema'
import type { PublicProduct } from '../storefront.service'
import { type Html, html, json, raw } from './html'
import { SITE_CSS } from './site-css'
import { PRODUCT_SCRIPT } from './site-script'

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
      <body>
        ${ctx.preview ? html`<div class="preview">Pré-visualização: o site ainda não está no ar. Só você (logada) vê esta página.</div>` : ''}
        <header class="top">
          <div class="wrap">
            <a class="brand" href="${base(ctx)}">${ctx.title}</a>
            ${chat ? html`<a class="btn btn-ghost" href="${chat}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          </div>
        </header>
        <main class="wrap">${page.body}</main>
        <footer class="foot">
          <div class="wrap">
            <p class="brand-small">${ctx.title}</p>
            <p>
              ${chat ? html`<a href="${chat}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
              ${ctx.settings.instagram ? html`<a href="https://instagram.com/${ctx.settings.instagram}" target="_blank" rel="noopener">Instagram @${ctx.settings.instagram}</a>` : ''}
            </p>
          </div>
        </footer>
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
      <p class="price">${price(p)}</p>
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
        ${p.images.length > 1 ? html`<div class="thumbs" id="thumbs">${p.images.map((img, i) => html`<button type="button" data-large="${img.largeUrl}" data-color="${img.color ?? ''}" class="${i === 0 ? 'on' : ''}" aria-label="Foto ${i + 1}"><img src="${img.thumbUrl}" alt="" loading="lazy" /></button>`)}</div>` : ''}
      </div>
      <div class="info">
        <h1>${p.name}</h1>
        <p class="price big">${price(p)}</p>
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
        ${ask ? html`<a class="btn" id="ask" href="${ask}" target="_blank" rel="noopener">Quero esta peça — falar no WhatsApp</a>` : ''}
        ${p.description ? html`<div class="desc">${p.description.split(/\n{2,}/).map((t) => html`<p>${t}</p>`)}</div>` : ''}
      </div>
    </article>
    <script type="application/json" id="product-data">
      ${json({ name: p.name, url, colors: p.colors, whatsapp: ctx.settings.whatsapp })}
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

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
  /** Categorias com peças no site (menu do topo). */
  categories: string[]
}

const base = (ctx: SiteContext) => `/${ctx.settings.slug}`
const categoryLink = (ctx: SiteContext, c: string | null) =>
  c ? `${base(ctx)}?categoria=${encodeURIComponent(c)}#colecao` : base(ctx)
export const productPath = (ctx: SiteContext, p: PublicProduct) => `${base(ctx)}/p/${p.id}/${slugify(p.name)}`

const price = (p: PublicProduct) =>
  p.priceCents === null ? 'Consulte' : `${p.priceFrom ? 'a partir de ' : ''}${formatBRL(p.priceCents)}`

/** Preço com o “de” riscado quando houver (RN-LOJ-09). */
const priceHtml = (p: PublicProduct) =>
  p.compareAtCents ? html`<s class="was">${formatBRL(p.compareAtCents)}</s> ${price(p)}` : html`${price(p)}`

const discount = (p: PublicProduct) =>
  p.compareAtCents && p.priceCents ? Math.round((1 - p.priceCents / p.compareAtCents) * 100) : 0

export const whatsappLink = (ctx: SiteContext, text: string) =>
  ctx.settings.whatsapp ? `https://wa.me/${ctx.settings.whatsapp}?text=${encodeURIComponent(text)}` : null

const ICON = {
  bag: raw(
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8h13l-1 12.5h-11L5.5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  ),
  close: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'),
  wa: raw(
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm4.6 12.6c-.2.6-1.1 1.1-1.6 1.2-.4 0-.9.2-3-.6-2.5-1-4.1-3.6-4.2-3.7-.1-.2-1-1.3-1-2.5s.6-1.8.9-2.1c.2-.2.5-.3.6-.3h.5c.1 0 .4 0 .5.4l.8 1.8c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.8-.1 1.4Z"/></svg>',
  ),
  tick: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5"/></svg>'),
}

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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
        ${ctx.settings.announcement ? html`<div class="announce">${ctx.settings.announcement}</div>` : ''}
        <header class="top">
          <div class="wrap">
            <a class="brand" href="${base(ctx)}">${ctx.title}</a>
            ${ctx.categories.length ? html`<nav class="nav" aria-label="Categorias">${ctx.categories.slice(0, 6).map((c) => html`<a href="${categoryLink(ctx, c)}">${c}</a>`)}</nav>` : ''}
            <div class="top-actions">
              <a class="icon-btn" href="${base(ctx)}/sacola" data-open-bag aria-label="Abrir sacola"
                >${ICON.bag}<span class="count" data-bag-count hidden></span
              ></a>
            </div>
          </div>
        </header>
        <main class="wrap">${page.body}</main>
        <footer class="foot">
          <div class="wrap">
            <div>
              <a class="brand" href="${base(ctx)}">${ctx.title}</a>
              ${ctx.settings.tagline ? html`<p>${ctx.settings.tagline}</p>` : ''}
            </div>
            <nav>
              ${chat ? html`<a href="${chat}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
              ${ctx.settings.instagram ? html`<a href="https://instagram.com/${ctx.settings.instagram}" target="_blank" rel="noopener">Instagram @${ctx.settings.instagram}</a>` : ''}
              <a href="${base(ctx)}/sacola">Minha sacola</a>
              <a href="${base(ctx)}/privacidade">Privacidade</a>
            </nav>
          </div>
        </footer>
        ${chat ? html`<a class="wa-float" href="${chat}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ICON.wa}</a>` : ''}
        <div class="overlay" id="overlay"></div>
        <aside class="drawer" id="drawer" aria-label="Sacola" aria-hidden="true">
          <header>
            <b>Sua sacola</b
            ><button type="button" class="icon-btn" data-close-bag aria-label="Fechar">${ICON.close}</button>
          </header>
          <p class="added" hidden>✓ Peça adicionada à sacola</p>
          <div class="list"></div>
          <footer>
            <p class="sum"><span>Total</span><b data-total></b></p>
            <a class="btn accent wide" data-checkout href="${base(ctx)}/sacola">Finalizar pedido</a>
            <button type="button" class="btn ghost wide" data-close-bag>Continuar comprando</button>
          </footer>
        </aside>
        <script>
          ${raw(BAG_SCRIPT)}
        </script>
      </body>
    </html>`
}

function card(ctx: SiteContext, p: PublicProduct) {
  const [cover, second] = p.images
  const off = discount(p)
  return html`<li class="card reveal${p.soldOut ? ' sold' : ''}">
    <a href="${productPath(ctx, p)}">
      <div class="ph">
        ${cover ? html`<img src="${cover.thumbUrl}" alt="${p.name}" loading="lazy" width="400" height="500" />` : html`<span>${p.name.slice(0, 1)}</span>`}
        ${second ? html`<img class="alt" src="${second.thumbUrl}" alt="" loading="lazy" width="400" height="500" />` : ''}
        <div class="badges">
          ${p.soldOut ? html`<em class="badge">Esgotado</em>` : ''}
          ${!p.soldOut && off >= 5 ? html`<em class="badge off">-${off}%</em>` : ''}
          ${!p.soldOut && p.fewLeft ? html`<em class="badge hot">Últimas peças</em>` : ''}
        </div>
        ${!p.soldOut ? html`<span class="quick">Ver detalhes</span>` : ''}
      </div>
      <p class="name">${p.name}</p>
      <p class="price">${priceHtml(p)}</p>
    </a>
  </li>`
}

export function homePage(ctx: SiteContext, products: PublicProduct[], category: string | null) {
  const shown = category ? products.filter((p) => p.category === category) : products
  const photos = products.flatMap((p) => (p.images[0] && !p.soldOut ? [p.images[0]] : [])).slice(0, 3)
  const chat = whatsappLink(ctx, `Olá! Vim pelo site da ${ctx.title}.`)
  const body = html` <section class="hero">
      <div>
        <span class="eyebrow">Nova coleção</span>
        <h1>${ctx.title}</h1>
        <p class="lead">
          ${ctx.settings.tagline ?? 'Peças escolhidas com carinho para você. Escolha, monte sua sacola e a gente finaliza pelo WhatsApp.'}
        </p>
        <div class="ctas">
          <a class="btn accent" href="#colecao">Ver a coleção</a>
          ${chat ? html`<a class="btn ghost" href="${chat}" target="_blank" rel="noopener">Falar com a loja</a>` : ''}
        </div>
      </div>
      ${
        photos.length
          ? html`<div class="mosaic${photos.length === 1 ? ' solo' : ''}">
              ${photos.map((img) => html`<div class="ph"><img src="${img.largeUrl}" alt="" /></div>`)}
            </div>`
          : html`<div class="blob" aria-hidden="true">${ctx.title.slice(0, 1)}</div>`
      }
    </section>
    <section class="perks">
      <div class="perk">
        <i>💬</i>
        <div><b>Atendimento no WhatsApp</b><span>Tire dúvidas de tamanho e cor</span></div>
      </div>
      <div class="perk">
        <i>🛍️</i>
        <div><b>Sem cadastro</b><span>Monte a sacola e envie em 1 minuto</span></div>
      </div>
      <div class="perk">
        <i>🤝</i>
        <div><b>Pagamento combinado</b><span>A loja chama você para finalizar</span></div>
      </div>
    </section>
    <section id="colecao">
      <div class="section-head"><h2>${category ?? 'Coleção'}</h2></div>
      ${
        ctx.categories.length > 1
          ? html`<nav class="chips" aria-label="Categorias">
              <a href="${categoryLink(ctx, null)}#colecao" class="${category ? '' : 'on'}">Tudo</a>
              ${ctx.categories.map((c) => html`<a href="${categoryLink(ctx, c)}" class="${c === category ? 'on' : ''}">${c}</a>`)}
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
    </section>
    ${
      ctx.settings.about
        ? html`<section class="about reveal">
            <h2>Sobre a ${ctx.title}</h2>
            ${ctx.settings.about.split(/\n{2,}/).map((t) => html`<p>${t}</p>`)}
          </section>`
        : ''
    }`
  return layout(ctx, {
    title: category ? `${category} · ${ctx.title}` : ctx.title,
    image: products.find((p) => p.images[0])?.images[0]?.largeUrl,
    path: categoryLink(ctx, category).replace('#colecao', ''),
    body,
  })
}

export function productPage(ctx: SiteContext, p: PublicProduct) {
  const url = `${ctx.origin}${productPath(ctx, p)}`
  const cover = p.images[0]
  // começa na cor da foto de capa (se ela for de uma cor), para foto e tamanhos combinarem
  const firstColor = p.colors.find((c) => c.color === cover?.color)?.color ?? p.colors[0]?.color
  const ask = whatsappLink(ctx, `Olá! Tenho interesse em: ${p.name}\n${url}`)
  const off = discount(p)
  const body = html` <nav class="crumbs">
      <a href="${base(ctx)}">Início</a
      >${p.category ? html` / <a href="${categoryLink(ctx, p.category)}">${p.category}</a>` : ''} / ${p.name}
    </nav>
    <article class="product">
      <div class="gallery">
        <div class="main ph">
          ${cover ? html`<img id="main-img" src="${cover.largeUrl}" alt="${p.name}" width="${cover.width}" height="${cover.height}" />` : html`<span>${p.name.slice(0, 1)}</span>`}
          ${p.images.length > 1 ? html`<button type="button" class="arrow prev" data-d="-1" aria-label="Foto anterior">‹</button><button type="button" class="arrow next" data-d="1" aria-label="Próxima foto">›</button>` : ''}
        </div>
        ${p.images.length > 1 ? html`<div class="thumbs" id="thumbs">${p.images.map((img, i) => html`<button type="button" data-large="${img.largeUrl}" data-thumb="${img.thumbUrl}" data-color="${img.color ?? ''}" class="${i === 0 ? 'on' : ''}" aria-label="Foto ${i + 1}"><img src="${img.thumbUrl}" alt="" loading="lazy" /></button>`)}</div>` : ''}
      </div>
      <div class="info">
        ${p.category ? html`<span class="eyebrow">${p.category}</span>` : ''}
        <h1>${p.name}</h1>
        <p class="price big">${priceHtml(p)}${off >= 5 ? html`<span class="saving">${off}% OFF</span>` : ''}</p>
        ${p.soldOut ? html`<p class="warn">Esgotado no momento. Fale com a loja para saber da reposição.</p>` : ''}
        ${!p.soldOut && p.fewLeft ? html`<p class="urgency">Últimas peças disponíveis</p>` : ''}
        ${
          p.colors.length
            ? html`<div class="opts" id="opts">
                <p class="label">Cor <b id="color-name"></b></p>
                <div class="chips" id="colors">
                  ${p.colors.map((c) => html`<button type="button" data-color="${c.color}" class="${c.color === firstColor ? 'on' : ''}">${c.color}</button>`)}
                </div>
                <p class="label">Tamanho <b id="size-name"></b></p>
                <div class="chips" id="sizes"></div>
              </div>`
            : ''
        }
        ${
          !p.soldOut
            ? html`<div class="buy">
                <div class="qty-box">
                  <button type="button" data-q="-1" aria-label="Menos">−</button><span id="qty">1</span
                  ><button type="button" data-q="1" aria-label="Mais">+</button>
                </div>
                <button type="button" class="btn accent" id="add" disabled>Escolha o tamanho</button>
              </div>`
            : ''
        }
        ${ask ? html`<a class="btn ghost wide" style="margin-top:10px" id="ask" href="${ask}" target="_blank" rel="noopener">${ICON.wa} Tirar dúvida no WhatsApp</a>` : ''}
        <ul class="trust">
          <li>💬 Atendimento pelo WhatsApp para ajudar com o tamanho</li>
          <li>🛍️ Sem cadastro: envie o pedido e a loja chama você</li>
          <li>🤝 Pagamento e entrega combinados direto com a loja</li>
        </ul>
        ${
          p.description
            ? html`<details class="more" open>
                <summary>Detalhes da peça</summary>
                <div class="desc">${p.description.split(/\n{2,}/).map((t) => html`<p>${t}</p>`)}</div>
              </details>`
            : ''
        }
      </div>
    </article>
    ${!p.soldOut ? html`<div class="buybar"><span class="p">${priceHtml(p)}</span><button type="button" class="btn accent">Escolher tamanho</button></div>` : ''}
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
  const notesLabel = ctx.settings.notesLabel ?? 'Observação'
  const body = html` <div class="steps" aria-hidden="true">
      <span class="on"><i>1</i>Sacola</span><span><i>2</i>Seus dados</span><span><i>3</i>Pronto</span>
    </div>
    <h1 class="page-title">Sua sacola</h1>
    <div class="cart">
      <div class="panel" id="bag-summary">
        <div id="bag-items"></div>
        <p class="bag-total"><span>Total</span><strong id="bag-total"></strong></p>
      </div>
      <p id="bag-empty" class="empty" hidden>
        Sua sacola está vazia.<br /><br /><a class="btn accent" href="${base(ctx)}">Ver as peças</a>
      </p>
      <form id="checkout" class="panel checkout" hidden>
        <h2>Finalizar pedido</h2>
        <p class="muted">Sem pagamento agora: a vendedora chama você no WhatsApp para combinar pagamento e entrega.</p>
        <label class="field"
          >Nome<input
            name="name"
            required
            minlength="2"
            maxlength="120"
            autocomplete="name"
            placeholder="Como podemos te chamar?"
        /></label>
        <label class="field"
          >WhatsApp<input name="whatsapp" required inputmode="tel" autocomplete="tel" placeholder="(11) 99999-8888"
        /></label>
        <div class="two">
          <label class="field"
            >E-mail (opcional)<input
              name="email"
              type="email"
              autocomplete="email"
              placeholder="para receber a confirmação"
          /></label>
          <label class="field"
            >Cidade (opcional)<input name="city" maxlength="100" autocomplete="address-level2"
          /></label>
        </div>
        <label class="field"
          >${notesLabel}${ctx.settings.notesRequired ? '' : ' (opcional)'}<textarea
            name="notes"
            rows="2"
            maxlength="1000"
            ${ctx.settings.notesRequired ? raw('required') : ''}
          ></textarea>
        </label>
        ${ctx.settings.checkoutNotice ? html`<p class="notice">${ctx.settings.checkoutNotice}</p>` : ''}
        <label class="hp" aria-hidden="true">Site<input name="website" tabindex="-1" autocomplete="off" /></label>
        <label class="check"
          ><input type="checkbox" name="consent" required />
          <span
            >Li e aceito a <a href="${base(ctx)}/privacidade" target="_blank">política de privacidade</a>.</span
          ></label
        >
        <p id="form-error" class="warn" hidden></p>
        <button type="submit" class="btn accent wide">Enviar pedido</button>
      </form>
      <div id="done" class="panel done" hidden>
        <div class="tick">${ICON.tick}</div>
        <h2>Pedido <span data-number></span> recebido!</h2>
        <p class="muted">Obrigada! A vendedora vai chamar você no WhatsApp para combinar pagamento e entrega.</p>
        <p style="margin:20px 0 10px">
          ${ctx.settings.whatsapp ? html`<a class="btn wa wide" data-wa href="#" target="_blank" rel="noopener">${ICON.wa} Enviar o pedido no WhatsApp</a>` : ''}
        </p>
        <a class="btn ghost wide" href="${base(ctx)}">Continuar vendo as peças</a>
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
    body: html`<section class="about text-left" style="margin-top:40px">
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
    body: html`<section class="hero" style="text-align:center;grid-template-columns:1fr">
      <div>
        <h1>Peça não encontrada</h1>
        <p class="lead" style="margin:0 auto 24px">Ela pode ter saído do site.</p>
        <a class="btn accent" href="${base(ctx)}">Ver todas as peças</a>
      </div>
    </section>`,
  })
}

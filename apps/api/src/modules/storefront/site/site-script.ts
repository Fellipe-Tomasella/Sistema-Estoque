// Scripts do site público (sem framework). A sacola fica no navegador (localStorage), por loja;
// o servidor recalcula preços e disponibilidade quando o pedido é enviado (RN-LOJ-05).

/**
 * Em todas as páginas (fim do <body>): sacola (ler/gravar), contador no topo, gaveta lateral que abre ao
 * adicionar (“Adicionado à sacola”), aviso rápido (toast) e animação de aparecer ao rolar.
 */
export const BAG_SCRIPT = `(() => {
  const key = 'sacola:' + document.body.dataset.store
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
  const save = (items) => { try { localStorage.setItem(key, JSON.stringify(items)) } catch {} }
  const drawer = document.getElementById('drawer')
  const overlay = document.getElementById('overlay')
  const list = drawer && drawer.querySelector('.list')
  const listeners = []

  function lineHtml(item, i) {
    const li = document.createElement('div')
    li.className = 'line'
    li.innerHTML = '<a class="ph"></a><div><a class="n"></a><span class="v"></span>'
      + '<div class="mini-qty"><button type="button" data-d="-1" aria-label="Menos">−</button><b></b>'
      + '<button type="button" data-d="1" aria-label="Mais">+</button><button type="button" class="rm">Remover</button></div></div>'
      + '<span class="pr"></span>'
    const ph = li.querySelector('.ph'); ph.href = item.url
    if (item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = ''; ph.appendChild(img) }
    const n = li.querySelector('.n'); n.href = item.url; n.textContent = item.name
    li.querySelector('.v').textContent = [item.color, item.size].filter(Boolean).join(' · ')
    li.querySelector('.mini-qty b').textContent = item.qty
    li.querySelector('.pr').textContent = item.priceCents === null ? 'Consulte' : brl(item.priceCents * item.qty)
    li.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
      const all = read(); all[i].qty = Math.max(1, Math.min(20, all[i].qty + Number(b.dataset.d))); bag.write(all)
    }))
    li.querySelector('.rm').addEventListener('click', () => { const all = read(); all.splice(i, 1); bag.write(all) })
    return li
  }

  function totals(items) {
    let cents = 0, hidden = false
    for (const i of items) { if (i.priceCents === null) hidden = true; else cents += i.priceCents * i.qty }
    return { cents, hidden, label: brl(cents) + (hidden ? ' + a consultar' : ''), count: items.reduce((s, i) => s + i.qty, 0) }
  }

  function paint(animate) {
    const items = read(), t = totals(items)
    document.querySelectorAll('[data-bag-count]').forEach((el) => {
      el.textContent = t.count ? String(t.count) : ''; el.hidden = !t.count
      if (animate) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop') }
    })
    if (list) {
      list.innerHTML = ''
      if (!items.length) list.innerHTML = '<p class="empty">Sua sacola está vazia.</p>'
      items.forEach((item, i) => list.appendChild(lineHtml(item, i)))
      drawer.querySelector('[data-total]').textContent = items.length ? t.label : brl(0)
      drawer.querySelector('[data-checkout]').hidden = !items.length
    }
    listeners.forEach((fn) => fn(items, t))
  }

  function open(added) {
    if (!drawer) return
    drawer.querySelector('.added').hidden = !added
    drawer.classList.add('open'); overlay.classList.add('open'); drawer.setAttribute('aria-hidden', 'false')
  }
  function close() {
    if (!drawer) return
    drawer.classList.remove('open'); overlay.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true')
  }

  const bag = window.bag = {
    read, totals, brl, open, close,
    write(items) { save(items); paint(false) },
    onChange(fn) { listeners.push(fn) },
    add(item, qty) {
      const items = read()
      const found = items.find((i) => i.variantId === item.variantId)
      if (found) found.qty = Math.min(20, found.qty + qty)
      else items.push({ ...item, qty: Math.min(20, qty) })
      save(items); paint(true); open(true)
    },
  }

  window.toast = (text) => {
    let el = document.querySelector('.toast')
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el) }
    el.textContent = text; el.classList.add('show')
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600)
  }

  document.querySelectorAll('[data-open-bag]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(false) }))
  document.querySelectorAll('[data-close-bag]').forEach((b) => b.addEventListener('click', close))
  if (overlay) overlay.addEventListener('click', close)
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close() })

  // aparecer ao rolar (cards, seções)
  const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
  }, { rootMargin: '0px 0px -40px 0px' })
  document.querySelectorAll('.reveal').forEach((el, i) => {
    if (!io) return el.classList.add('in')
    el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el)
  })
  paint(false)
})()`

/** Página do produto: cor (fotos e tamanhos dela), tamanho, quantidade, setas da galeria e barra fixa no celular. */
export const PRODUCT_SCRIPT = `(() => {
  const data = JSON.parse(document.getElementById('product-data').textContent)
  const main = document.getElementById('main-img')
  const thumbs = [...document.querySelectorAll('#thumbs button')]
  const colors = [...document.querySelectorAll('#colors button')]
  const sizesBox = document.getElementById('sizes')
  const ask = document.getElementById('ask')
  const add = document.getElementById('add')
  const qtyEl = document.getElementById('qty')
  const colorName = document.getElementById('color-name')
  const sizeName = document.getElementById('size-name')
  const buybar = document.querySelector('.buybar')
  const initial = colors.find((b) => b.classList.contains('on')) || colors[0]
  let color = initial ? initial.dataset.color : null
  let chosen = null
  let qty = 1

  // galeria: mostra as fotos da cor escolhida (e as gerais); setas passam entre elas
  const visibleThumbs = () => thumbs.filter((t) => !t.dataset.color || t.dataset.color === color)
  function show(btn) {
    if (!main || !btn) return
    main.src = btn.dataset.large
    thumbs.forEach((b) => b.classList.toggle('on', b === btn))
  }
  thumbs.forEach((b) => b.addEventListener('click', () => show(b)))
  document.querySelectorAll('.gallery .arrow').forEach((a) => a.addEventListener('click', () => {
    const list = visibleThumbs(); if (!list.length) return
    const i = list.findIndex((t) => t.classList.contains('on'))
    show(list[(i + Number(a.dataset.d) + list.length) % list.length])
  }))

  function refresh() {
    const label = chosen ? 'Adicionar à sacola' : 'Escolha o tamanho'
    if (add) { add.disabled = !chosen; add.textContent = label }
    if (buybar) buybar.querySelector('.btn').textContent = chosen ? 'Adicionar' : 'Escolher tamanho'
    if (colorName) colorName.textContent = color || ''
    if (sizeName) sizeName.textContent = chosen ? chosen.size : ''
    if (!ask || !data.whatsapp) return
    const choice = [color, chosen && chosen.size].filter(Boolean).join(' / ')
    const text = 'Olá! Tenho interesse em: ' + data.name + (choice ? ' (' + choice + ')' : '') + '\\n' + data.url
    ask.href = 'https://wa.me/' + data.whatsapp + '?text=' + encodeURIComponent(text)
  }

  function renderSizes() {
    if (!sizesBox) return
    const entry = data.colors.find((c) => c.color === color)
    sizesBox.innerHTML = ''
    const sizes = entry ? entry.sizes : []
    chosen = sizes.length === 1 && sizes[0].available ? sizes[0] : null
    for (const s of sizes) {
      const b = document.createElement('button')
      b.type = 'button'; b.textContent = s.size; b.disabled = !s.available
      if (!s.available) b.title = 'Esgotado'
      if (chosen === s) b.classList.add('on')
      b.addEventListener('click', () => {
        chosen = s
        sizesBox.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b))
        refresh()
      })
      sizesBox.appendChild(b)
    }
    refresh()
  }

  colors.forEach((b) => b.addEventListener('click', () => {
    color = b.dataset.color
    colors.forEach((x) => x.classList.toggle('on', x === b))
    show(visibleThumbs()[0])
    renderSizes()
  }))
  document.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    qty = Math.max(1, Math.min(20, qty + Number(b.dataset.q))); if (qtyEl) qtyEl.textContent = qty
  }))

  function addToBag() {
    if (!chosen) {
      (sizesBox || document.body).scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.toast && window.toast('Escolha o tamanho primeiro')
      return
    }
    const photo = visibleThumbs()[0]
    window.bag.add({
      variantId: chosen.variantId, name: data.name, color, size: chosen.size, priceCents: data.priceCents,
      image: (photo && photo.dataset.thumb) || data.image, url: data.url,
    }, qty)
  }
  if (add) add.addEventListener('click', addToBag)
  if (buybar) {
    buybar.querySelector('.btn').addEventListener('click', addToBag)
    document.body.classList.add('has-buybar')
    // barra fixa aparece quando o botão principal sai da tela
    if (add && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => buybar.classList.toggle('show', !e.isIntersecting)).observe(add)
    }
  }
  renderSizes()
})()`

/** Sacola e finalizar pedido: lista, quantidades, formulário curto e envio com chave contra envio duplicado. */
// espera a página carregar: o BAG_SCRIPT (window.bag) vem no fim do <body>
export const CART_SCRIPT = `addEventListener('DOMContentLoaded', () => {
  const cfg = JSON.parse(document.getElementById('cart-data').textContent)
  const bag = window.bag
  const list = document.getElementById('bag-items')
  const totalEl = document.getElementById('bag-total')
  const form = document.getElementById('checkout')
  const empty = document.getElementById('bag-empty')
  const summary = document.getElementById('bag-summary')
  const done = document.getElementById('done')
  const errorEl = document.getElementById('form-error')
  const steps = [...document.querySelectorAll('.steps span')]
  const keyName = 'pedido:' + document.body.dataset.store
  const step = (n) => steps.forEach((s, i) => s.classList.toggle('on', i <= n))

  function render(items, t) {
    list.innerHTML = ''
    empty.hidden = items.length > 0
    form.hidden = items.length === 0
    summary.hidden = items.length === 0
    items.forEach((item, index) => {
      const li = document.createElement('div')
      li.className = 'line'
      li.innerHTML = '<a class="ph"></a><div><a class="n"></a><span class="v"></span>'
        + '<div class="mini-qty"><button type="button" data-d="-1" aria-label="Menos">−</button><b></b>'
        + '<button type="button" data-d="1" aria-label="Mais">+</button><button type="button" class="rm">Remover</button></div></div>'
        + '<span class="pr"></span>'
      const ph = li.querySelector('.ph'); ph.href = item.url
      if (item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = ''; ph.appendChild(img) }
      const n = li.querySelector('.n'); n.href = item.url; n.textContent = item.name
      li.querySelector('.v').textContent = [item.color, item.size].filter(Boolean).join(' · ')
      li.querySelector('.mini-qty b').textContent = item.qty
      li.querySelector('.pr').textContent = item.priceCents === null ? 'Consulte' : bag.brl(item.priceCents * item.qty)
      li.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
        const all = bag.read(); all[index].qty = Math.max(1, Math.min(20, all[index].qty + Number(b.dataset.d))); bag.write(all)
      }))
      li.querySelector('.rm').addEventListener('click', () => { const all = bag.read(); all.splice(index, 1); bag.write(all) })
      list.appendChild(li)
    })
    totalEl.textContent = items.length ? t.label : ''
  }
  bag.onChange(render)
  render(bag.read(), bag.totals(bag.read()))
  form.addEventListener('focusin', () => step(1))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.hidden = true
    const items = bag.read()
    if (!items.length) return
    const fd = new FormData(form)
    let key = sessionStorage.getItem(keyName)
    if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(keyName, key) }
    const button = form.querySelector('button[type=submit]')
    button.disabled = true; button.textContent = 'Enviando…'
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.qty })),
          name: fd.get('name'), whatsapp: fd.get('whatsapp'), email: fd.get('email') || null,
          city: fd.get('city') || null, notes: fd.get('notes') || null, consent: fd.get('consent') === 'on',
          website: fd.get('website') || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((body.error && body.error.message) || 'Não foi possível enviar. Tente de novo.')
      sessionStorage.removeItem(keyName)
      const text = items.map((i) => i.qty + 'x ' + i.name + ' (' + [i.color, i.size].filter(Boolean).join(' / ') + ')').join('\\n')
      bag.write([])
      form.hidden = true; summary.hidden = true; empty.hidden = true
      done.hidden = false
      step(2)
      done.querySelector('[data-number]').textContent = body.number ? 'nº ' + body.number : ''
      const wa = done.querySelector('[data-wa]')
      if (wa && cfg.whatsapp) {
        wa.href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(
          'Olá! Acabei de fazer o pedido ' + (body.number ? 'nº ' + body.number + ' ' : '') + 'pelo site:\\n' + text)
      }
      scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      errorEl.textContent = err.message === 'Failed to fetch' ? 'Sem internet. Tente de novo.' : err.message
      errorEl.hidden = false
    } finally {
      button.disabled = false; button.textContent = 'Enviar pedido'
    }
  })
})`

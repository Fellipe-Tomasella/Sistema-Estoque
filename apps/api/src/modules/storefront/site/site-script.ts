// Scripts do site público (sem framework). A sacola fica no navegador (localStorage), por loja;
// o servidor recalcula preços e disponibilidade quando o pedido é enviado (RN-LOJ-05).

/** Sacola: leitura/gravação e o número no ícone do topo. Vai em todas as páginas. */
export const BAG_SCRIPT = `(() => {
  const key = 'sacola:' + document.body.dataset.store
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
  const write = (items) => { try { localStorage.setItem(key, JSON.stringify(items)) } catch {} ; window.bag.paint() }
  window.bag = {
    read, write,
    add(item) {
      const items = read()
      const found = items.find((i) => i.variantId === item.variantId)
      if (found) found.qty = Math.min(20, found.qty + 1)
      else items.push({ ...item, qty: 1 })
      write(items)
    },
    paint() {
      const n = read().reduce((s, i) => s + i.qty, 0)
      document.querySelectorAll('[data-bag-count]').forEach((el) => { el.textContent = n ? String(n) : ''; el.hidden = !n })
    },
  }
  window.bag.paint()
})()`

/** Página do produto: troca de cor (fotos e tamanhos), adicionar à sacola e WhatsApp com a escolha. */
export const PRODUCT_SCRIPT = `(() => {
  const data = JSON.parse(document.getElementById('product-data').textContent)
  const main = document.getElementById('main-img')
  const thumbs = [...document.querySelectorAll('#thumbs button')]
  const colors = [...document.querySelectorAll('#colors button')]
  const sizesBox = document.getElementById('sizes')
  const ask = document.getElementById('ask')
  const add = document.getElementById('add')
  const added = document.getElementById('added')
  const initial = colors.find((b) => b.classList.contains('on')) || colors[0]
  let color = initial ? initial.dataset.color : null
  let chosen = null

  function show(btn) {
    if (!main || !btn) return
    main.src = btn.dataset.large
    thumbs.forEach((b) => b.classList.toggle('on', b === btn))
  }
  thumbs.forEach((b) => b.addEventListener('click', () => show(b)))

  function refresh() {
    if (add) {
      add.disabled = !chosen
      add.textContent = chosen ? 'Adicionar à sacola' : 'Escolha o tamanho'
    }
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
    // um tamanho só e disponível: já vem escolhido
    chosen = sizes.length === 1 && sizes[0].available ? sizes[0] : null
    for (const s of sizes) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = s.size
      b.disabled = !s.available
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

  colors.forEach((b) =>
    b.addEventListener('click', () => {
      color = b.dataset.color
      colors.forEach((x) => x.classList.toggle('on', x === b))
      show(thumbs.find((t) => t.dataset.color === color))
      renderSizes()
    }),
  )
  if (add) add.addEventListener('click', () => {
    if (!chosen) return
    const photo = (thumbs.find((t) => t.dataset.color === color) || {}).dataset
    window.bag.add({
      variantId: chosen.variantId, name: data.name, color, size: chosen.size, priceCents: data.priceCents,
      image: (photo && photo.thumb) || data.image, url: data.url,
    })
    if (added) added.hidden = false
  })
  renderSizes()
})()`

/** Sacola e finalizar pedido: lista, quantidades, formulário curto e envio com chave contra envio duplicado. */
// espera a página carregar: o BAG_SCRIPT (window.bag) vem no fim do <body>
export const CART_SCRIPT = `addEventListener('DOMContentLoaded', () => {
  const cfg = JSON.parse(document.getElementById('cart-data').textContent)
  const list = document.getElementById('bag-items')
  const totalEl = document.getElementById('bag-total')
  const form = document.getElementById('checkout')
  const empty = document.getElementById('bag-empty')
  const done = document.getElementById('done')
  const errorEl = document.getElementById('form-error')
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const keyName = 'pedido:' + document.body.dataset.store

  function render() {
    const items = window.bag.read()
    list.innerHTML = ''
    empty.hidden = items.length > 0
    form.hidden = items.length === 0
    let total = 0, hidden = false
    items.forEach((item, index) => {
      if (item.priceCents === null) hidden = true; else total += item.priceCents * item.qty
      const li = document.createElement('li')
      li.className = 'bag-line'
      li.innerHTML = '<a class="ph small"></a><div class="bag-info"><a class="name"></a><p class="muted"></p>'
        + '<div class="qty"><button type="button" data-d="-1" aria-label="Menos">−</button><span></span>'
        + '<button type="button" data-d="1" aria-label="Mais">+</button>'
        + '<button type="button" class="link" data-rm>Remover</button></div></div><p class="price"></p>'
      const ph = li.querySelector('.ph'); ph.href = item.url
      if (item.image) { const img = document.createElement('img'); img.src = item.image; img.alt = ''; ph.appendChild(img) }
      const name = li.querySelector('.name'); name.href = item.url; name.textContent = item.name
      li.querySelector('.muted').textContent = [item.color, item.size].filter(Boolean).join(' / ')
      li.querySelector('.qty span').textContent = item.qty
      li.querySelector('.price').textContent = item.priceCents === null ? 'Consulte' : brl(item.priceCents * item.qty)
      li.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
        const all = window.bag.read(); const it = all[index]
        it.qty = Math.max(1, Math.min(20, it.qty + Number(b.dataset.d))); window.bag.write(all); render()
      }))
      li.querySelector('[data-rm]').addEventListener('click', () => {
        const all = window.bag.read(); all.splice(index, 1); window.bag.write(all); render()
      })
      list.appendChild(li)
    })
    totalEl.textContent = items.length ? brl(total) + (hidden ? ' + itens a consultar' : '') : ''
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.hidden = true
    const items = window.bag.read()
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
      const summary = items.map((i) => i.qty + 'x ' + i.name + ' (' + [i.color, i.size].filter(Boolean).join(' / ') + ')').join('\\n')
      window.bag.write([])
      form.hidden = true; list.innerHTML = ''; totalEl.textContent = ''
      done.hidden = false
      done.querySelector('[data-number]').textContent = body.number ? 'nº ' + body.number : ''
      const wa = done.querySelector('[data-wa]')
      if (wa && cfg.whatsapp) {
        wa.href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(
          'Olá! Acabei de fazer o pedido ' + (body.number ? 'nº ' + body.number + ' ' : '') + 'pelo site:\\n' + summary)
      }
      done.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      errorEl.textContent = err.message === 'Failed to fetch' ? 'Sem internet. Tente de novo.' : err.message
      errorEl.hidden = false
    } finally {
      button.disabled = false; button.textContent = 'Enviar pedido'
    }
  })
  render()
})`

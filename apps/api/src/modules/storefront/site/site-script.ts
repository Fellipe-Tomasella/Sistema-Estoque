// Página do produto: troca de cor (fotos e tamanhos daquela cor) e mensagem do WhatsApp com a escolha.
export const PRODUCT_SCRIPT = `(() => {
  const data = JSON.parse(document.getElementById('product-data').textContent)
  const main = document.getElementById('main-img')
  const thumbs = [...document.querySelectorAll('#thumbs button')]
  const colors = [...document.querySelectorAll('#colors button')]
  const sizesBox = document.getElementById('sizes')
  const ask = document.getElementById('ask')
  const initial = colors.find((b) => b.classList.contains('on')) || colors[0]
  let color = initial ? initial.dataset.color : null
  let size = null

  function show(btn) {
    if (!main || !btn) return
    main.src = btn.dataset.large
    thumbs.forEach((b) => b.classList.toggle('on', b === btn))
  }
  thumbs.forEach((b) => b.addEventListener('click', () => show(b)))

  function message() {
    if (!ask || !data.whatsapp) return
    const choice = [color, size].filter(Boolean).join(' / ')
    const text = 'Olá! Tenho interesse em: ' + data.name + (choice ? ' (' + choice + ')' : '') + '\\n' + data.url
    ask.href = 'https://wa.me/' + data.whatsapp + '?text=' + encodeURIComponent(text)
  }

  function renderSizes() {
    if (!sizesBox) return
    const entry = data.colors.find((c) => c.color === color)
    sizesBox.innerHTML = ''
    size = null
    for (const s of entry ? entry.sizes : []) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = s.size
      b.disabled = !s.available
      if (!s.available) b.title = 'Esgotado'
      b.addEventListener('click', () => {
        size = s.size
        sizesBox.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b))
        message()
      })
      sizesBox.appendChild(b)
    }
    message()
  }

  colors.forEach((b) =>
    b.addEventListener('click', () => {
      color = b.dataset.color
      colors.forEach((x) => x.classList.toggle('on', x === b))
      show(thumbs.find((t) => t.dataset.color === color))
      renderSizes()
    }),
  )
  renderSizes()
})()`

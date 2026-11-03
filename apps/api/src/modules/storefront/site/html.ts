// HTML do site público montado no servidor: toda interpolação é escapada, salvo o que já é `Html`.

export class Html {
  constructor(readonly value: string) {}
  toString() {
    return this.value
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c]!)

type Value = string | number | boolean | null | undefined | Html | Value[]

function render(value: Value): string {
  if (value === null || value === undefined || value === false || value === true) return ''
  if (value instanceof Html) return value.value
  if (Array.isArray(value)) return value.map(render).join('')
  return escape(String(value))
}

/** `html\`<p>${texto}</p>\`` escapa `texto`; listas e outros `html` entram como estão. */
export function html(strings: TemplateStringsArray, ...values: Value[]): Html {
  return new Html(strings.reduce((out, part, i) => out + part + (i < values.length ? render(values[i]!) : ''), ''))
}

/** Conteúdo já seguro (CSS, JSON escapado). */
export const raw = (text: string) => new Html(text)

/** JSON para `<script type="application/json">`, sem permitir fechar a tag. */
export const json = (data: unknown) => raw(JSON.stringify(data).replace(/</g, '\\u003c'))

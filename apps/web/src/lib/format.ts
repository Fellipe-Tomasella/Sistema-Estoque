// Formatação só na borda (UI): valores em centavos e datas AAAA-MM-DD vindos da API.
export { formatBRL } from '@estoque/shared'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const longDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const toDate = (value: string | Date) =>
  value instanceof Date ? value : /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)

/** "30/10/2026" */
export const formatDate = (value: string | Date | null | undefined) => (value ? dateFormat.format(toDate(value)) : '')

/** "hoje, 14:32" · "ontem, 09:10" · "28/10/2026 às 15:30" */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = toDate(value)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return `hoje, ${timeFormat.format(date)}`
  if (sameDay(date, yesterday)) return `ontem, ${timeFormat.format(date)}`
  return `${dateFormat.format(date)} às ${timeFormat.format(date)}`
}

/** "terça-feira, 29 de outubro de 2026" */
export const formatLongDate = (value: string | Date) => longDate.format(toDate(value))

export const pieces = (n: number) => `${n} ${n === 1 ? 'peça' : 'peças'}`

/** Hoje no relógio do aparelho (AAAA-MM-DD). Não usar toISOString: em UTC, depois das 21h no Brasil já é amanhã. */
export const localToday = () => new Date().toLocaleDateString('sv-SE')

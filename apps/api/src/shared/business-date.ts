// `business_date`: o dia da loja (no fuso configurado) em que um fato aconteceu. Relatórios e fechamento usam esta data.

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    // en-CA formata como AAAA-MM-DD
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

/** Instante → 'AAAA-MM-DD' no fuso da loja. */
export function businessDate(instant: Date, timeZone: string): string {
  return formatterFor(timeZone).format(instant)
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone)
    return true
  } catch {
    return false
  }
}

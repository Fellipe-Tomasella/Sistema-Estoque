// Itens de nota de fornecedor (RN-EST-11): “CAMISOLA LIA (VERDE MILITAR) - Tamanho G” → produto, cor e tamanho.

export interface ParsedItem {
  name: string
  color: string
  size: string
}

const words = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()
const title = (text: string) => words(text).replace(/(^|\s|-)(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
const sentence = (text: string) => words(text).replace(/^\p{L}/u, (ch) => ch.toUpperCase())

/**
 * Lê produto, cor e tamanho do texto do item. Formatos aceitos:
 * “NOME (COR) - Tamanho M”, “NOME (COR) TAM M”, “NOME COR - Tam: M”. null = não deu para separar.
 */
export function parseItemDescription(description: string): ParsedItem | null {
  const text = description.replace(/\s+/g, ' ').trim()
  const size = /(?:^|[\s-])(?:tamanho|tam\.?|tm)\s*:?\s*([\w/]+)\s*$/i.exec(text)
  if (!size) return null
  const rest = text.slice(0, size.index).replace(/[\s-]+$/, '')
  const color = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(rest)
  if (!color || !color[1]!.trim()) return null
  return { name: title(color[1]!), color: sentence(color[2]!), size: size[1]!.toUpperCase() }
}

/** Chave para comparar nomes sem acento, maiúsculas nem espaços extras. */
export const matchKey = (...parts: string[]) =>
  parts.map((p) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()).join('|')

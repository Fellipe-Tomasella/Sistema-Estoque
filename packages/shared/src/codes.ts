// Códigos padronizados (RN-PRO-15): produto P00001; variação P00001-PRE-M.

const letters = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

/** “Preta” → PRE; “Azul claro” → AZUC; “Off white” → OFFW. */
export function colorCode(color: string): string {
  const [first = '', ...rest] = letters(color)
  return first.slice(0, 3) + rest.map((word) => word[0]).join('')
}

export const productCode = (sequence: number) => `P${String(sequence).padStart(5, '0')}`

/** SKU da variação a partir da referência do produto, cor e tamanho. */
export function variantSku(reference: string, color: string, size: string): string {
  return [reference.trim().toUpperCase(), colorCode(color), letters(size).join('')].filter(Boolean).join('-')
}

/** Código de barras: só dígitos, 8 a 14 (EAN-8, UPC-A, EAN-13, GTIN-14). “SEM GTIN” da NF-e vira null. */
export function normalizeBarcode(text: string | null | undefined): string | null {
  const digits = (text ?? '').replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 14 ? digits : null
}

/** Dígito verificador do EAN-13 (sobre os 12 primeiros dígitos). */
export function ean13CheckDigit(first12: string): number {
  const sum = [...first12].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10
}

/**
 * Código de barras interno da loja (RN-PRO-16): EAN-13 com prefixo 20 (uso interno, não é GS1) +
 * número sequencial + verificador. Lido por qualquer leitor como um EAN normal.
 */
export function internalEan13(sequence: number): string {
  const first12 = `20${String(sequence).padStart(10, '0')}`
  return first12 + ean13CheckDigit(first12)
}

export const isValidEan13 = (code: string) =>
  /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12])

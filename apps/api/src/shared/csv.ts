// CSV para abrir no Excel em português: separador `;`, vírgula decimal e BOM para manter os acentos.

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

const BOM = String.fromCharCode(0xfeff)
const LINE_BREAK = '\r\n'

const quote = (value: string) => (/[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

/** Centavos → "1234,56" (sem "R$", para a planilha tratar como número). */
export const csvMoney = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [
    columns.map((c) => quote(c.header)).join(';'),
    ...rows.map((row) => columns.map((c) => quote(String(c.value(row) ?? ''))).join(';')),
  ]
  return BOM + lines.join(LINE_BREAK) + LINE_BREAK
}

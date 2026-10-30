// Lê .xlsx (ExcelJS) e .csv (papaparse) em linhas `{ line, cells }` com cabeçalhos normalizados.
import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import { ValidationError } from '../../shared/errors'

export type Cell = string | number | null
export interface RawRow {
  /** Número da linha na planilha (o cabeçalho é a linha 1). */
  line: number
  cells: Record<string, Cell>
}

/** "Preço" → "preco", "Alerta mínimo" → "alerta_minimo". */
export const normalizeHeader = (header: string) =>
  header
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\*/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

function cellValue(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if ('richText' in value) return value.richText.map((part) => part.text).join('')
  if ('result' in value) return cellValue(value.result as ExcelJS.CellValue)
  if ('text' in value) return String(value.text)
  return null
}

function toRows(matrix: Cell[][]): { headers: string[]; rows: RawRow[] } {
  const [headerRow = [], ...body] = matrix
  const headers = headerRow.map((h) => normalizeHeader(String(h ?? '')))
  const rows = body
    .map((values, index) => ({
      line: index + 2,
      cells: Object.fromEntries(headers.map((header, i) => [header, values[i] ?? null])),
    }))
    .filter((row) => Object.values(row.cells).some((v) => v !== null && String(v).trim() !== ''))
  return { headers, rows }
}

async function readXlsx(buffer: ArrayBuffer): Promise<Cell[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []
  const matrix: Cell[][] = []
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: Cell[] = []
    row.eachCell({ includeEmpty: true }, (cell, col) => (values[col - 1] = cellValue(cell.value)))
    matrix[rowNumber - 1] = values
  })
  return Array.from(matrix, (row) => row ?? [])
}

function readCsv(text: string): Cell[][] {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const parsed = Papa.parse<string[]>(withoutBom, { skipEmptyLines: 'greedy', delimiter: '' })
  return parsed.data
}

export async function readSpreadsheet(file: File) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) return toRows(await readXlsx(await file.arrayBuffer()))
  if (name.endsWith('.csv')) return toRows(readCsv(await file.text()))
  throw new ValidationError('Envie um arquivo .xlsx ou .csv.')
}

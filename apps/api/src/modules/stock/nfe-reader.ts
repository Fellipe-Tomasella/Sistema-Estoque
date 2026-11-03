import { normalizeBarcode, onlyDigits } from '@estoque/shared'
import { XMLParser } from 'fast-xml-parser'
import { ValidationError } from '../../shared/errors'

/** Item da nota como veio do fornecedor (RN-EST-11). */
export interface NfeItem {
  /** Posição na nota (1, 2, 3…). */
  index: number
  /** Código do produto no fornecedor (cProd). */
  code: string
  barcode: string | null
  description: string
  ncm: string | null
  unit: string
  quantity: number
  /** Quantidade na nota não era inteira (ex.: 2,5): conferir antes de lançar. */
  fractional: boolean
  unitCostCents: number
  totalCents: number
}

export interface NfeDocument {
  accessKey: string | null
  number: string | null
  series: string | null
  issuedAt: string | null
  supplier: { name: string; document: string }
  items: NfeItem[]
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  parseTagValue: false,
  trimValues: true,
})
const asList = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]
const cents = (value: unknown) => Math.round(Number(String(value ?? '0').replace(',', '.')) * 100)
const text = (value: unknown) => (value === undefined || value === null ? null : String(value).trim() || null)

type Node = Record<string, unknown>

/** Lê o XML da NF-e (nfeProc ou NFe) do fornecedor. Não valida assinatura nem consulta a SEFAZ. */
export function readNfe(xml: string): NfeDocument {
  let doc: Node
  try {
    doc = parser.parse(xml) as Node
  } catch {
    throw new ValidationError('Arquivo não é um XML válido.')
  }
  const proc = doc.nfeProc as Node | undefined
  const nfe = (proc?.NFe ?? doc.NFe) as Node | undefined
  const inf = nfe?.infNFe as Node | undefined
  if (!inf) throw new ValidationError('Este XML não é de uma NF-e (não achei a nota dentro dele).')

  const ide = (inf.ide ?? {}) as Node
  const emit = (inf.emit ?? {}) as Node
  const keyFromId = String(inf['@Id'] ?? '').replace(/^NFe/, '')
  const protKey = text(((proc?.protNFe as Node | undefined)?.infProt as Node | undefined)?.chNFe)
  const accessKey = [protKey, keyFromId].map((k) => onlyDigits(k ?? '')).find((k) => k.length === 44) ?? null

  const items = asList(inf.det as Node | Node[]).map((det, i): NfeItem => {
    const prod = (det.prod ?? {}) as Node
    const rawQty = Number(String(prod.qCom ?? '0').replace(',', '.'))
    return {
      index: Number(det['@nItem'] ?? i + 1),
      code: text(prod.cProd) ?? String(i + 1),
      barcode: normalizeBarcode(text(prod.cEAN)) ?? normalizeBarcode(text(prod.cEANTrib)),
      description: text(prod.xProd) ?? 'Item sem descrição',
      ncm: text(prod.NCM),
      unit: text(prod.uCom) ?? 'UN',
      quantity: Math.max(1, Math.round(rawQty)),
      fractional: !Number.isInteger(rawQty),
      unitCostCents: cents(prod.vUnCom),
      totalCents: cents(prod.vProd),
    }
  })
  if (items.length === 0) throw new ValidationError('A nota não tem itens.')

  return {
    accessKey,
    number: text(ide.nNF),
    series: text(ide.serie),
    issuedAt: text(ide.dhEmi ?? ide.dEmi)?.slice(0, 10) ?? null,
    supplier: {
      name: text(emit.xFant) ?? text(emit.xNome) ?? 'Fornecedor',
      document: onlyDigits(text(emit.CNPJ) ?? text(emit.CPF) ?? ''),
    },
    items,
  }
}

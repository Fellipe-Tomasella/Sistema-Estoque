import { onlyDigits } from '@estoque/shared'
import { ValidationError } from '../../shared/errors'
import type { NfeDocument, NfeItem } from './nfe-reader'

/**
 * Leitura do DANFE em PDF (a NF-e impressa, RN-EST-11). O PDF não tem os campos estruturados do XML: o texto
 * é lido linha a linha e a tabela “Dados dos produtos” é reconhecida pelo formato das colunas
 * (código, descrição, NCM, CST/CSOSN, CFOP, unidade, quantidade, valor unitário, valor total).
 * Serve para o modelo padrão do DANFE (o mesmo para qualquer emissor); confira sempre a prévia.
 */

/** Texto do PDF agrupado por linha (de cima para baixo, da esquerda para a direita). */
export async function pdfLines(data: Uint8Array): Promise<string[]> {
  // carregado só quando chega um PDF
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  let pdf
  try {
    pdf = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise
  } catch {
    throw new ValidationError('Não consegui abrir este PDF. Envie o PDF da nota (DANFE) ou o XML.')
  }
  const lines: string[] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent()
    const rows = new Map<number, [number, string][]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5])
      const row = rows.get(y) ?? rows.set(y, []).get(y)!
      row.push([item.transform[4], item.str.trim()])
    }
    for (const [, parts] of [...rows].sort((a, b) => b[0] - a[0])) {
      lines.push(
        parts
          .sort((a, b) => a[0] - b[0])
          .map(([, text]) => text)
          .join(' '),
      )
    }
  }
  return lines
}

const number = (text: string) => Number(text.replace(/\./g, '').replace(',', '.'))
const cents = (text: string) => Math.round(number(text) * 100)

// código · descrição · NCM (8) · CST/CSOSN (0/102, 102, 00…) · CFOP (4) · unidade · quantidade · unitário · total
const ITEM =
  /^(\S+)\s+(.*?)\s*(\d{8})\s+(\d{1,3}\/\d{2,3}|\d{2,4})\s+(\d{4})\s+([A-Za-z]{1,6})\s+([\d.]+,\d+)\s+([\d.]+,\d+)\s+([\d.]+,\d{2})/

/** Monta a nota a partir das linhas do DANFE. Exportada separada para testar sem PDF. */
export function parseDanfeLines(lines: string[]): NfeDocument {
  const text = lines.join('\n')
  if (!/DANFE|NF-e|Nota Fiscal Eletr/i.test(text)) {
    throw new ValidationError('Este PDF não parece ser uma nota fiscal (DANFE). Envie o PDF da NF-e ou o XML.')
  }

  const start = lines.findIndex((l) => /DADOS DOS PRODUTOS/i.test(l))
  const end = lines.findIndex((l, i) => i > start && /DADOS ADICIONAIS|C[ÁA]LCULO DO ISSQN/i.test(l))
  const items: NfeItem[] = []
  for (const line of lines.slice(start + 1, end === -1 ? undefined : end)) {
    const m = ITEM.exec(line)
    if (m) {
      const [, code, description, ncm, , , unit, qty, unitValue, total] = m
      const rawQty = number(qty!)
      items.push({
        index: items.length + 1,
        code: code!,
        barcode: null,
        description: description!.trim(),
        ncm: ncm!,
        unit: unit!.toUpperCase(),
        quantity: Math.max(1, Math.round(rawQty)),
        fractional: !Number.isInteger(rawQty),
        unitCostCents: cents(unitValue!),
        totalCents: cents(total!),
      })
    } else if (items.length && !/VALOR|ALÍQ|UNIT|C[ÓO]DIGO|DESCRI/i.test(line) && !/^[\d.,%\s/-]+$/.test(line)) {
      // (linha só de números = sobra de colunas de impostos, não é descrição)
      // a descrição quebrou para a linha de baixo (ex.: “QUADRINHOS) - Tamanho EXG”)
      const last = items[items.length - 1]!
      last.description = `${last.description} ${line.trim()}`.replace(/\s+/g, ' ')
    }
  }
  if (items.length === 0) {
    throw new ValidationError('Não achei os produtos neste PDF. Confira se é o DANFE da nota ou envie o XML.')
  }

  const key = /((?:\d{4}\s*){11})/.exec(text)?.[1]
  const accessKey = key && onlyDigits(key).length === 44 ? onlyDigits(key) : null
  const issued = /EMISS[ÃA]O:?\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(text) ?? /(\d{2})\/(\d{2})\/(\d{4})/.exec(text)
  const name =
    /RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS/i.exec(text.replace(/\n/g, ' '))?.[1] ??
    lines[lines.findIndex((l) => /IDENTIFICA[ÇC][ÃA]O DO EMITENTE/i.test(l)) + 2] ??
    'Fornecedor'
  const cnpj = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.exec(text)?.[0]

  return {
    accessKey,
    number: /N[º°o]\.?\s*([\d.]+)/i.exec(text)?.[1]?.replace(/\./g, '').replace(/^0+/, '') ?? null,
    series: /S[ée]rie\s*(\d+)/i.exec(text)?.[1]?.replace(/^0+(?=\d)/, '') ?? null,
    issuedAt: issued ? `${issued[3]}-${issued[2]}-${issued[1]}` : null,
    supplier: { name: name.trim(), document: cnpj ? onlyDigits(cnpj) : '' },
    items,
  }
}

export async function readDanfePdf(data: Uint8Array): Promise<NfeDocument> {
  return parseDanfeLines(await pdfLines(data))
}

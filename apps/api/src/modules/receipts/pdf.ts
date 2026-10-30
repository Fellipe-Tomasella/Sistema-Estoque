// Geração de PDF no servidor (pdfmake, fonte padrão Helvetica — sem arquivos de fonte).
import pdfmake from 'pdfmake'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'

pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
})
// Comprovantes não carregam nada de fora.
pdfmake.setUrlAccessPolicy(() => false)

/** Aviso fixo de todo comprovante (RN-VEN-14, RN-FIS-09). */
export const NOT_FISCAL = 'Comprovante de venda — não é documento fiscal.'

export async function renderPdf(content: Content[]): Promise<Buffer> {
  const definition: TDocumentDefinitions = {
    pageSize: 'A5',
    pageMargins: [28, 28, 28, 36],
    defaultStyle: { font: 'Helvetica', fontSize: 9 },
    content,
    styles: {
      title: { fontSize: 13, bold: true },
      muted: { color: '#555555' },
      total: { fontSize: 11, bold: true },
      alert: { fontSize: 12, bold: true, color: '#b91c1c' },
    },
  }
  return pdfmake.createPdf(definition).getBuffer()
}

export function formatDateTime(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(instant)
}

/** Duas colunas: rótulo à esquerda, valor à direita. */
export const row = (label: string, value: string, style?: string): Content => ({
  columns: [{ text: label }, { text: value, alignment: 'right', width: 'auto' }],
  style,
  margin: [0, 1, 0, 1],
})

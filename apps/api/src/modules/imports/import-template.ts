import ExcelJS from 'exceljs'

/** Modelo para download (RN-IMP-01). Colunas com * são obrigatórias. */
export async function buildTemplate(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Peças')
  sheet.columns = [
    { header: 'produto*', width: 28 },
    { header: 'cor*', width: 14 },
    { header: 'tamanho*', width: 10 },
    { header: 'preco*', width: 10 },
    { header: 'quantidade*', width: 12 },
    { header: 'alerta_minimo', width: 14 },
    { header: 'referencia', width: 14 },
    { header: 'categoria', width: 14 },
    { header: 'custo', width: 10 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.addRow(['Blusa básica', 'Preta', 'M', 49.9, 3, 1, 'BL-01', 'Blusas', 22])
  sheet.addRow(['Blusa básica', 'Preta', 'G', 49.9, 2, 1, 'BL-01', 'Blusas', 22])
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer
}

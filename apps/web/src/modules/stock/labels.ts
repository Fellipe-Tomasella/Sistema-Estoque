// Etiquetas com código de barras (RN-PRO-16): a tela Códigos guarda a seleção e abre a página de impressão.
export const LABELS_KEY = 'etiquetas'

export interface LabelLayout {
  id: string
  label: string
  /** CSS de @page e do tamanho de cada etiqueta. */
  page: string
  width: string
  height: string
  columns: number
}

export const LABEL_LAYOUTS: LabelLayout[] = [
  { id: 'a4', label: 'Folha A4 (3 × 10, tipo Pimaco 6180)', page: 'A4', width: '66.7mm', height: '25.4mm', columns: 3 },
  { id: 'termica', label: 'Etiqueta térmica 50 × 30 mm', page: '50mm 30mm', width: '50mm', height: '30mm', columns: 1 },
  {
    id: 'termica40',
    label: 'Etiqueta térmica 40 × 25 mm',
    page: '40mm 25mm',
    width: '40mm',
    height: '25mm',
    columns: 1,
  },
]

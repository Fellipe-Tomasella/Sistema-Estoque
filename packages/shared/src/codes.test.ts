import { describe, expect, test } from 'bun:test'
import { colorCode, internalEan13, isValidEan13, normalizeBarcode, productCode, variantSku } from './codes'

describe('códigos padronizados (RN-PRO-15)', () => {
  test('produto e variação', () => {
    expect(productCode(12)).toBe('P00012')
    expect(variantSku('P00012', 'Preta', 'M')).toBe('P00012-PRE-M')
    expect(variantSku('p00012', 'Azul claro', 'GG')).toBe('P00012-AZUC-GG')
    expect(colorCode('Off-white')).toBe('OFFW')
    expect(colorCode('Céu')).toBe('CEU')
  })

  test('código de barras só com 8 a 14 dígitos', () => {
    expect(normalizeBarcode('7891234567895')).toBe('7891234567895')
    expect(normalizeBarcode('SEM GTIN')).toBeNull()
    expect(normalizeBarcode('123')).toBeNull()
  })
})

describe('código de barras interno (RN-PRO-16)', () => {
  test('EAN-13 com prefixo 20 e dígito verificador válido', () => {
    expect(internalEan13(1)).toBe('2000000000015')
    expect(isValidEan13(internalEan13(123456))).toBe(true)
    expect(isValidEan13('7891234567895')).toBe(true)
    expect(isValidEan13('7891234567890')).toBe(false)
  })
})

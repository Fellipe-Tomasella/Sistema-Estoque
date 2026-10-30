import { describe, expect, test } from 'bun:test'
import { compareSizes, normalizeSize } from './sizes'

describe('ordem de tamanhos (RN-PRO-04)', () => {
  test('letras na ordem de vestuário', () => {
    expect(['G', 'PP', 'GG', 'M', 'P'].sort(compareSizes)).toEqual(['PP', 'P', 'M', 'G', 'GG'])
  })

  test('números em ordem numérica', () => {
    expect(['40', '36', '38', '100'].sort(compareSizes)).toEqual(['36', '38', '40', '100'])
  })

  test('letras, números, desconhecidos em ordem alfabética, único por último', () => {
    expect(['U', 'Infantil', '38', 'M', 'Adulto'].sort(compareSizes)).toEqual(['M', '38', 'Adulto', 'Infantil', 'U'])
  })

  test('não diferencia maiúsculas', () => {
    expect(['g', 'p'].sort(compareSizes)).toEqual(['p', 'g'])
  })

  test('normaliza espaços', () => {
    expect(normalizeSize('  Tam  Único ')).toBe('Tam Único')
  })
})

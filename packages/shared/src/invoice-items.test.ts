import { describe, expect, test } from 'bun:test'
import { matchKey, parseItemDescription } from './invoice-items'

describe('itens da nota do fornecedor', () => {
  test('separa produto, cor e tamanho no formato “NOME (COR) - Tamanho X”', () => {
    expect(parseItemDescription('CAMISOLA LIA (VERDE MILITAR) - Tamanho G')).toEqual({
      name: 'Camisola Lia',
      color: 'Verde militar',
      size: 'G',
    })
    expect(parseItemDescription('PIJAMA LONGO INF. SUEDE 784 (SITCH EM QUADRINHOS) - Tamanho EXG')).toEqual({
      name: 'Pijama Longo Inf. Suede 784',
      color: 'Sitch em quadrinhos',
      size: 'EXG',
    })
    expect(parseItemDescription('BODY RENDA (PRETO) TAM: 42')?.size).toBe('42')
  })

  test('sem cor ou sem tamanho não adivinha', () => {
    expect(parseItemDescription('KIT MEIAS SORTIDAS')).toBeNull()
    expect(parseItemDescription('BLUSA - Tamanho M')).toBeNull()
  })

  test('chave de comparação ignora acento e maiúsculas', () => {
    expect(matchKey('Camisola Lia', 'Fúcsia', 'P')).toBe(matchKey('CAMISOLA  LIA', 'fucsia', 'p'))
  })
})

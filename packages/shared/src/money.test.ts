import { describe, expect, test } from 'bun:test'
import { allocateDiscount, formatBRL, parseBRL, percentOf } from './money'

describe('parseBRL', () => {
  test.each([
    ['1.234,56', 123456],
    ['R$ 10', 1000],
    ['10,5', 1050],
    ['0,99', 99],
    ['1234', 123400],
    ['  R$ 1.000.000,00 ', 100000000],
  ])('%s → %d', (input, expected) => {
    expect(parseBRL(input)).toBe(expected)
  })

  test.each(['', 'abc', '10,555', '1.23,00', '-5', '10.5'])('rejeita "%s"', (input) => {
    expect(parseBRL(input)).toBeNull()
  })
})

describe('formatBRL', () => {
  test('formata em reais', () => {
    expect(formatBRL(123456)).toBe('R$ 1.234,56')
    expect(formatBRL(0)).toBe('R$ 0,00')
  })
})

describe('percentOf', () => {
  test('arredonda meio para cima', () => {
    expect(percentOf(1000, 1050)).toBe(105)
    expect(percentOf(5, 1000)).toBe(1) // 0,5 centavo → 1
    expect(percentOf(4, 1000)).toBe(0)
  })
})

describe('allocateDiscount', () => {
  test('rateio proporcional exato', () => {
    expect(allocateDiscount([10000, 5000], 1500)).toEqual([1000, 500])
  })

  test('soma sempre igual ao desconto', () => {
    const lines = [3333, 3333, 3334]
    const result = allocateDiscount(lines, 1000)
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000)
  })

  test('sobra vai para a linha de maior resto e é determinística', () => {
    expect(allocateDiscount([100, 100, 100], 100)).toEqual([34, 33, 33])
    expect(allocateDiscount([100, 100, 100], 100)).toEqual([34, 33, 33])
  })

  test('nenhuma linha recebe mais que o seu subtotal', () => {
    const lines = [1, 1, 1]
    const result = allocateDiscount(lines, 2)
    result.forEach((value, i) => expect(value).toBeLessThanOrEqual(lines[i]!))
    expect(result.reduce((a, b) => a + b, 0)).toBe(2)
  })

  test('desconto total zera todas as linhas', () => {
    expect(allocateDiscount([700, 300], 1000)).toEqual([700, 300])
  })

  test('sem desconto', () => {
    expect(allocateDiscount([700, 300], 0)).toEqual([0, 0])
  })

  test('desconto acima do subtotal é erro', () => {
    expect(() => allocateDiscount([100], 101)).toThrow()
  })
})

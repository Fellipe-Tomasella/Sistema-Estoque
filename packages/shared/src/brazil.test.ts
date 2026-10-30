import { describe, expect, test } from 'bun:test'
import { isValidCnpj, isValidCpf, isValidUf } from './brazil'

describe('CPF', () => {
  test.each(['529.982.247-25', '52998224725', '111.444.777-35'])('válido: %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true)
  })
  test.each(['529.982.247-24', '111.111.111-11', '123', ''])('inválido: %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false)
  })
})

describe('CNPJ', () => {
  test.each(['11.222.333/0001-81', '11222333000181'])('válido: %s', (cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(true)
  })
  test.each(['11.222.333/0001-80', '00.000.000/0000-00', '123'])('inválido: %s', (cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(false)
  })
})

test('UF', () => {
  expect(isValidUf('SP')).toBe(true)
  expect(isValidUf('XX')).toBe(false)
})

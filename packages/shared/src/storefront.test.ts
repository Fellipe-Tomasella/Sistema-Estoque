import { describe, expect, test } from 'bun:test'
import { slugify, storeSlugProblem } from './storefront'

describe('endereço da loja virtual', () => {
  test('sugere o caminho a partir do nome', () => {
    expect(slugify('Jooliv Lingeries')).toBe('jooliv-lingeries')
    expect(slugify('  Ateliê São João!  ')).toBe('atelie-sao-joao')
  })

  test('recusa caminho fora do padrão ou que já é tela do painel', () => {
    expect(storeSlugProblem('jooliv-lingeries')).toBeNull()
    expect(storeSlugProblem('Jooliv')).toContain('minúsculas')
    expect(storeSlugProblem('a-')).toContain('3 a 40')
    expect(storeSlugProblem('vendas')).toContain('tela do sistema')
  })
})

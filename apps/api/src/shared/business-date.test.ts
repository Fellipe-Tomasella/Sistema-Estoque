import { describe, expect, test } from 'bun:test'
import { businessDate, isValidTimeZone } from './business-date'

describe('businessDate (virada de dia no fuso da loja)', () => {
  test('23:30 em São Paulo ainda é o mesmo dia, embora em UTC já seja o seguinte', () => {
    const instant = new Date('2026-10-31T02:30:00Z') // 30/10 23:30 em São Paulo (UTC−3)
    expect(businessDate(instant, 'America/Sao_Paulo')).toBe('2026-10-30')
    expect(businessDate(instant, 'UTC')).toBe('2026-10-31')
  })

  test('meia-noite local já é o dia seguinte', () => {
    expect(businessDate(new Date('2026-10-31T03:00:00Z'), 'America/Sao_Paulo')).toBe('2026-10-31')
  })

  test('fuso amazônico (UTC−4)', () => {
    expect(businessDate(new Date('2026-10-31T03:30:00Z'), 'America/Manaus')).toBe('2026-10-30')
  })

  test('valida fuso', () => {
    expect(isValidTimeZone('America/Sao_Paulo')).toBe(true)
    expect(isValidTimeZone('Marte/Base')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { centsToEuros, eurosToCents, formatEuroInputValue, parseEuroInput } from './money'

describe('eurosToCents / centsToEuros', () => {
  it('round-trips exactly', () => {
    expect(centsToEuros(eurosToCents(12.34))).toBe(12.34)
  })

  it('rounds away float noise from the classic 0.1 + 0.2 problem', () => {
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
  })

  it('rounds float noise from a Postgres numeric(10,2) -> JS number conversion', () => {
    expect(eurosToCents(19.999999999999996)).toBe(2000)
  })
})

describe('parseEuroInput', () => {
  it('parses a comma-decimal German amount', () => {
    expect(parseEuroInput('12,34')).toBe(1234)
  })

  it('parses a dot-decimal amount', () => {
    expect(parseEuroInput('12.34')).toBe(1234)
  })

  it('parses a whole-euro amount without decimals', () => {
    expect(parseEuroInput('7')).toBe(700)
  })

  it('returns null for empty input', () => {
    expect(parseEuroInput('')).toBeNull()
    expect(parseEuroInput('   ')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseEuroInput('abc')).toBeNull()
  })
})

describe('formatEuroInputValue', () => {
  it('formats cents as a German-locale decimal string', () => {
    expect(formatEuroInputValue(1234)).toBe('12,34')
  })

  it('pads a whole-euro cent amount to two decimals', () => {
    expect(formatEuroInputValue(700)).toBe('7,00')
  })
})

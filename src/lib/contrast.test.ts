import { describe, expect, it } from 'vitest'
import { contrastRatio, isFullHexColor } from './contrast'

describe('contrastRatio', () => {
  it('gibt 21:1 für Schwarz gegen Weiß (WCAG-Maximum)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('gibt 1:1 für eine Farbe gegen sich selbst', () => {
    expect(contrastRatio('#b51a00', '#b51a00')).toBeCloseTo(1, 5)
  })

  it('ist symmetrisch (Reihenfolge der Argumente egal)', () => {
    expect(contrastRatio('#0f172a', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#0f172a'), 5)
  })

  it('bekannter Referenzwert: #767676 gegen Weiß liegt nahe an der 4,5:1-Schwelle', () => {
    // Häufig zitierter WCAG-Beispielwert für "gerade noch AA-konform" bei normalem Text.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1)
  })

  it('der Code-Default der Primärfarbe (#0f172a, siehe src/index.css) hat weit mehr als 3:1 gegen Weiß', () => {
    expect(contrastRatio('#0f172a', '#ffffff')).toBeGreaterThan(3)
  })
})

describe('isFullHexColor', () => {
  it('akzeptiert einen vollständigen #rrggbb-Wert', () => {
    expect(isFullHexColor('#0f172a')).toBe(true)
  })

  it('lehnt unvollständige Zwischenstände beim Tippen ab', () => {
    expect(isFullHexColor('#0f1')).toBe(false)
    expect(isFullHexColor('#')).toBe(false)
    expect(isFullHexColor('')).toBe(false)
  })

  it('lehnt ungültige Zeichen ab', () => {
    expect(isFullHexColor('#gggggg')).toBe(false)
  })
})

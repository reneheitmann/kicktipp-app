import { describe, expect, it } from 'vitest'
import { computeAmounts, parsePercent } from './payoutCalculations'

describe('parsePercent', () => {
  it('parses a plain integer', () => {
    expect(parsePercent('50')).toBe(50)
  })

  it('accepts a comma as decimal separator (deutsche Eingabe)', () => {
    expect(parsePercent('33,33')).toBeCloseTo(33.33)
  })

  it('accepts a dot as decimal separator', () => {
    expect(parsePercent('33.33')).toBeCloseTo(33.33)
  })

  it('returns NaN for non-numeric input', () => {
    expect(Number.isNaN(parsePercent('abc'))).toBe(true)
  })
})

describe('computeAmounts', () => {
  it('returns an empty array for no ranks', () => {
    expect(computeAmounts([], 10_000)).toEqual([])
  })

  it('gives the full pool to a single rank at 100%', () => {
    expect(computeAmounts([100], 10_000)).toEqual([10_000])
  })

  it('distributes a pool evenly across ranks that divide without remainder', () => {
    // 100,00 € Topf (10.000 Cent), 50/30/20 % -> exakt teilbar.
    expect(computeAmounts([50, 30, 20], 10_000)).toEqual([5_000, 3_000, 2_000])
  })

  it('gives an empty-pool distribution all zeros', () => {
    expect(computeAmounts([50, 30, 20], 0)).toEqual([0, 0, 0])
  })

  it('rounds every rank except the last, then assigns the exact remainder to the last rank', () => {
    // 10,00 € Topf (1.000 Cent) auf 3 gleiche Drittel: 333,33 Cent je Rang
    // naiv gerundet, in Summe 999 statt 1.000 – der Rest muss beim letzten
    // Rang landen, nicht verloren gehen und nicht bei einem der anderen.
    const amounts = computeAmounts([33.33, 33.33, 33.34], 1_000)
    expect(amounts[0]).toBe(333)
    expect(amounts[1]).toBe(333)
    // Der letzte Rang bekommt den exakten Rest, nicht den naiv gerundeten Wert.
    expect(amounts[2]).toBe(1_000 - 333 - 333)
  })

  it('never lets the summed amounts exceed the pool, regardless of individual rounding (Cent-Reste)', () => {
    // Bewusst ungerade Aufteilung über viele Ränge, die garantiert nicht
    // rundungsfrei aufgeht (analog zum Float-Drift-Regressionstest in
    // balanceCalculations.test.ts, hier: Rundungs-Drift über viele Ränge
    // statt Float-Drift über viele Additionen).
    const percents = [16.66, 16.67, 16.67, 16.67, 16.67, 16.66]
    const pool = 12_347 // bewusst kein "glatter" Cent-Betrag
    const amounts = computeAmounts(percents, pool)
    const sum = amounts.reduce((s, a) => s + a, 0)
    expect(sum).toBe(pool)
    expect(Number.isInteger(sum)).toBe(true)
  })

  it('gives a single participant (Gesamtwertung mit nur einem Teilnehmer) the entire pool at 100%', () => {
    expect(computeAmounts([100], 7_450)).toEqual([7_450])
  })
})

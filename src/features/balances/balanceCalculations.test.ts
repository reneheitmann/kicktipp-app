import { describe, expect, it } from 'vitest'
import { computePlayerBalances } from './balanceCalculations'
import type { Player, SeasonParticipant, Transaction, Zahlung } from '../../types/database'

const player = (id: string, name: string): Player => ({ id, name, kicktipp_name: null, created_at: '' })

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'player_id' | 'typ' | 'betrag'>): Transaction {
  return {
    id: crypto.randomUUID(),
    season_id: 'season-1',
    matchday_id: null,
    datum: '2026-01-01',
    notiz: null,
    source_season_participant_id: null,
    source_matchday_entry_id: null,
    created_at: '',
    ...overrides,
  }
}

function zahlung(overrides: Partial<Zahlung> & Pick<Zahlung, 'player_id' | 'typ' | 'betrag'>): Zahlung {
  return {
    id: crypto.randomUUID(),
    season_id: 'season-1',
    datum: '2026-01-01',
    notiz: null,
    created_by: null,
    created_at: '',
    ...overrides,
  }
}

describe('computePlayerBalances', () => {
  it('returns an empty array for no transactions/players', () => {
    expect(computePlayerBalances([], [])).toEqual([])
  })

  it('computes gesamtsieg and spieltag saldo from einsatz/gewinn transactions', () => {
    const players = [player('p1', 'Anna')]
    const transactions = [
      tx({ player_id: 'p1', typ: 'einsatz_gesamt', betrag: 10 }),
      tx({ player_id: 'p1', typ: 'gewinn_gesamt', betrag: 25 }),
      tx({ player_id: 'p1', typ: 'einsatz_spieltag', betrag: 5 }),
      tx({ player_id: 'p1', typ: 'gewinn_spieltag', betrag: 8 }),
    ]

    const [balance] = computePlayerBalances(transactions, players)

    expect(balance.gesamtsieg_saldo).toBe(15)
    expect(balance.spieltag_saldo).toBe(3)
    expect(balance.gesamt_saldo).toBe(18)
  })

  it('includes a player who only has payments and no transactions', () => {
    const players = [player('p1', 'Anna')]
    const zahlungen = [zahlung({ player_id: 'p1', typ: 'einzahlung', betrag: 50 })]

    const balances = computePlayerBalances([], players, [], 0, zahlungen)

    expect(balances).toHaveLength(1)
    expect(balances[0].gesamt_saldo).toBe(50)
    expect(balances[0].gesamtsieg_saldo).toBe(0)
    expect(balances[0].spieltag_saldo).toBe(0)
  })

  it('subtracts auszahlung from gesamt_saldo', () => {
    const players = [player('p1', 'Anna')]
    const zahlungen = [
      zahlung({ player_id: 'p1', typ: 'einzahlung', betrag: 50 }),
      zahlung({ player_id: 'p1', typ: 'auszahlung', betrag: 20 }),
    ]

    const [balance] = computePlayerBalances([], players, [], 0, zahlungen)

    expect(balance.gesamt_saldo).toBe(30)
  })

  it('leaves spieltag_einsatz at 0 when matchdayCount is 0, even with a participant entry', () => {
    const players = [player('p1', 'Anna')]
    const participants: SeasonParticipant[] = [
      {
        id: 'sp1',
        season_id: 'season-1',
        player_id: 'p1',
        gesamtsieg_einsatz_betrag: 10,
        spieltags_einsatz_betrag: 2,
        created_at: '',
      },
    ]

    const [balance] = computePlayerBalances([], players, participants, 0)

    expect(balance.spieltag_einsatz).toBe(0)
  })

  it('derives spieltag_einsatz from spieltags_einsatz_betrag × matchdayCount, overriding booked einsatz_spieltag transactions', () => {
    const players = [player('p1', 'Anna')]
    const participants: SeasonParticipant[] = [
      {
        id: 'sp1',
        season_id: 'season-1',
        player_id: 'p1',
        gesamtsieg_einsatz_betrag: 10,
        spieltags_einsatz_betrag: 3,
        created_at: '',
      },
    ]
    const transactions = [tx({ player_id: 'p1', typ: 'einsatz_spieltag', betrag: 999 })]

    const [balance] = computePlayerBalances(transactions, players, participants, 4)

    expect(balance.spieltag_einsatz).toBe(12)
  })

  it('books a korrektur with matchday_id set into the spieltag bucket, not gesamtsieg', () => {
    const players = [player('p1', 'Anna')]
    const transactions = [tx({ player_id: 'p1', typ: 'korrektur', betrag: -7, matchday_id: 'md-1' })]

    const [balance] = computePlayerBalances(transactions, players)

    expect(balance.spieltag_saldo).toBe(-7)
    expect(balance.gesamtsieg_saldo).toBe(0)
  })

  it('books a korrektur without matchday_id into the gesamtsieg bucket', () => {
    const players = [player('p1', 'Anna')]
    const transactions = [tx({ player_id: 'p1', typ: 'korrektur', betrag: -7, matchday_id: null })]

    const [balance] = computePlayerBalances(transactions, players)

    expect(balance.gesamtsieg_saldo).toBe(-7)
    expect(balance.spieltag_saldo).toBe(0)
  })

  it('applies a negative korrektur to reduce an otherwise positive saldo', () => {
    const players = [player('p1', 'Anna')]
    const transactions = [
      tx({ player_id: 'p1', typ: 'gewinn_gesamt', betrag: 20 }),
      tx({ player_id: 'p1', typ: 'korrektur', betrag: -15, matchday_id: null }),
    ]

    const [balance] = computePlayerBalances(transactions, players)

    expect(balance.gesamtsieg_saldo).toBe(5)
  })

  it('sorts the result alphabetically by name regardless of input order', () => {
    const players = [player('p1', 'Zeno'), player('p2', 'Anna'), player('p3', 'Moritz')]
    const transactions = [
      tx({ player_id: 'p1', typ: 'einsatz_gesamt', betrag: 1 }),
      tx({ player_id: 'p2', typ: 'einsatz_gesamt', betrag: 1 }),
      tx({ player_id: 'p3', typ: 'einsatz_gesamt', betrag: 1 }),
    ]

    const balances = computePlayerBalances(transactions, players)

    expect(balances.map((b) => b.name)).toEqual(['Anna', 'Moritz', 'Zeno'])
  })

  it('falls back to "Unbekannter Spieler" when a transaction references a player not in the players list', () => {
    const transactions = [tx({ player_id: 'ghost', typ: 'einsatz_gesamt', betrag: 5 })]

    const [balance] = computePlayerBalances(transactions, [])

    expect(balance.name).toBe('Unbekannter Spieler')
  })
})

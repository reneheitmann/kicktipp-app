import type { Player, SeasonParticipant, Transaction } from '../../types/database'

export interface PlayerBalance {
  player_id: string
  name: string
  gesamtsieg_einsatz: number
  gesamtsieg_gewinn: number
  gesamtsieg_saldo: number
  spieltag_einsatz: number
  spieltag_gewinn: number
  spieltag_saldo: number
  gesamt_saldo: number
}

interface Accumulator {
  name: string
  gesamtsieg_einsatz: number
  gesamtsieg_gewinn: number
  gesamtsieg_korrektur: number
  spieltag_einsatz: number
  spieltag_gewinn: number
  spieltag_korrektur: number
}

/**
 * Aggregiert Transaktionen zu einem Saldo je Spieler, getrennt nach
 * Einsatzart. Korrektur-Buchungen werden anhand von matchday_id (gesetzt =
 * Spieltags-Topf, null = Gesamtsieg-Topf) der jeweiligen Einsatzart
 * zugerechnet, da der Transaktionstyp selbst das nicht weiter unterscheidet.
 *
 * Der Spieltags-Einsatz wird – sofern `participants` und `matchdayCount`
 * übergeben werden – bewusst per Formel (Standard-Spieltagseinsatz × Anzahl
 * angelegter Spieltage) statt aus der Summe der bisher gebuchten
 * einsatz_spieltag-Transaktionen berechnet, damit der volle erwartete
 * Saison-Beitrag sichtbar ist, auch wenn noch nicht alle Spieltage angelegt
 * wurden (analog zur Kontostand-Berechnung in accountBalance.ts).
 */
export function computePlayerBalances(
  transactions: Transaction[],
  players: Player[],
  participants: SeasonParticipant[] = [],
  matchdayCount = 0,
): PlayerBalance[] {
  const accumulators = new Map<string, Accumulator>()

  function get(playerId: string): Accumulator {
    let entry = accumulators.get(playerId)
    if (!entry) {
      const player = players.find((p) => p.id === playerId)
      entry = {
        name: player?.name ?? 'Unbekannter Spieler',
        gesamtsieg_einsatz: 0,
        gesamtsieg_gewinn: 0,
        gesamtsieg_korrektur: 0,
        spieltag_einsatz: 0,
        spieltag_gewinn: 0,
        spieltag_korrektur: 0,
      }
      accumulators.set(playerId, entry)
    }
    return entry
  }

  for (const tx of transactions) {
    const entry = get(tx.player_id)
    const isSpieltagBucket = tx.typ === 'einsatz_spieltag' || tx.typ === 'gewinn_spieltag' || tx.matchday_id !== null

    if (tx.typ === 'einsatz_gesamt') {
      entry.gesamtsieg_einsatz += tx.betrag
    } else if (tx.typ === 'gewinn_gesamt') {
      entry.gesamtsieg_gewinn += tx.betrag
    } else if (tx.typ === 'einsatz_spieltag') {
      entry.spieltag_einsatz += tx.betrag
    } else if (tx.typ === 'gewinn_spieltag') {
      entry.spieltag_gewinn += tx.betrag
    } else if (tx.typ === 'korrektur') {
      if (isSpieltagBucket) {
        entry.spieltag_korrektur += tx.betrag
      } else {
        entry.gesamtsieg_korrektur += tx.betrag
      }
    }
  }

  for (const participant of participants) {
    const entry = get(participant.player_id)
    entry.spieltag_einsatz = participant.spieltags_einsatz_betrag * matchdayCount
  }

  const balances: PlayerBalance[] = [...accumulators.entries()].map(([player_id, entry]) => {
    const gesamtsieg_saldo = entry.gesamtsieg_gewinn - entry.gesamtsieg_einsatz + entry.gesamtsieg_korrektur
    const spieltag_saldo = entry.spieltag_gewinn - entry.spieltag_einsatz + entry.spieltag_korrektur
    return {
      player_id,
      name: entry.name,
      gesamtsieg_einsatz: entry.gesamtsieg_einsatz,
      gesamtsieg_gewinn: entry.gesamtsieg_gewinn,
      gesamtsieg_saldo,
      spieltag_einsatz: entry.spieltag_einsatz,
      spieltag_gewinn: entry.spieltag_gewinn,
      spieltag_saldo,
      gesamt_saldo: gesamtsieg_saldo + spieltag_saldo,
    }
  })

  return balances.sort((a, b) => a.name.localeCompare(b.name))
}

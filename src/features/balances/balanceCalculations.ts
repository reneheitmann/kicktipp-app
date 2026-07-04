import type { Cents } from '../../lib/money'
import type { Player, SeasonParticipant, Transaction, Zahlung } from '../../types/database'

export interface PlayerBalance {
  player_id: string
  name: string
  gesamtsieg_einsatz: Cents
  gesamtsieg_gewinn: Cents
  gesamtsieg_saldo: Cents
  spieltag_einsatz: Cents
  spieltag_gewinn: Cents
  spieltag_saldo: Cents
  gesamt_saldo: Cents
}

interface Accumulator {
  name: string
  gesamtsieg_einsatz: Cents
  gesamtsieg_gewinn: Cents
  gesamtsieg_korrektur: Cents
  spieltag_einsatz: Cents
  spieltag_gewinn: Cents
  spieltag_korrektur: Cents
}

/**
 * Aggregiert Transaktionen zu einem Saldo je Spieler, getrennt nach
 * Einsatzart. Korrektur-Buchungen werden anhand von matchday_id (gesetzt =
 * Spieltags-Topf, null = Gesamtwertung-Topf) der jeweiligen Einsatzart
 * zugerechnet, da der Transaktionstyp selbst das nicht weiter unterscheidet.
 *
 * Alle Beträge (Eingaben wie Ergebnis) sind ganze Cent (`Cents`, siehe
 * src/lib/money.ts), nicht Euro-Floats – Integer-Addition/-Subtraktion ist
 * exakt, während Euro-Floats bei vielen Einzelbuchungen Fließkomma-Drift
 * ansammeln könnten (0.1 + 0.2-Problem). Die Umrechnung Euro<->Cent passiert
 * ausschließlich an der API-Grenze (siehe *Api.ts-Dateien), hier drin bleibt
 * die Arithmetik unverändert reine Ganzzahl-Rechnung.
 *
 * Der Spieltags-Einsatz wird – sofern `participants` und `matchdayCount`
 * übergeben werden – bewusst per Formel (Standard-Spieltagseinsatz × Anzahl
 * angelegter Spieltage) statt aus der Summe der bisher gebuchten
 * einsatz_spieltag-Transaktionen berechnet, damit der volle erwartete
 * Saison-Beitrag sichtbar ist, auch wenn noch nicht alle Spieltage angelegt
 * wurden (analog zur Kontostand-Berechnung in accountBalance.ts).
 *
 * `gesamtsieg_saldo`/`spieltag_saldo` bleiben reine Spiel-Ergebnisse (Einsatz
 * vs. Gewinn je Topf, ohne Zahlungen) – nützlich, um die Performance je
 * Einsatzart zu sehen. `gesamt_saldo` bezieht zusätzlich `zahlungen`
 * (Ein-/Auszahlungen) ein, damit die Summe exakt dem tatsächlichen Guthaben
 * aus accountBalance.ts entspricht (dort: `-offen`) – ohne das würden
 * Guthabenübersicht/Saisonvergleich systematisch von der Konten-Übersicht
 * abweichen, sobald ein Spieler ein-/ausgezahlt hat.
 */
export function computePlayerBalances(
  transactions: Transaction[],
  players: Player[],
  participants: SeasonParticipant[] = [],
  matchdayCount = 0,
  zahlungen: Zahlung[] = [],
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

  const zahlungenSaldoByPlayer = new Map<string, number>()
  for (const z of zahlungen) {
    get(z.player_id) // stellt sicher, dass auch reine Zahler ohne Buchungen in der Ausgabe erscheinen
    const delta = z.typ === 'einzahlung' ? z.betrag : -z.betrag
    zahlungenSaldoByPlayer.set(z.player_id, (zahlungenSaldoByPlayer.get(z.player_id) ?? 0) + delta)
  }

  const balances: PlayerBalance[] = [...accumulators.entries()].map(([player_id, entry]) => {
    const gesamtsieg_saldo = entry.gesamtsieg_gewinn - entry.gesamtsieg_einsatz + entry.gesamtsieg_korrektur
    const spieltag_saldo = entry.spieltag_gewinn - entry.spieltag_einsatz + entry.spieltag_korrektur
    const zahlungenSaldo = zahlungenSaldoByPlayer.get(player_id) ?? 0
    return {
      player_id,
      name: entry.name,
      gesamtsieg_einsatz: entry.gesamtsieg_einsatz,
      gesamtsieg_gewinn: entry.gesamtsieg_gewinn,
      gesamtsieg_saldo,
      spieltag_einsatz: entry.spieltag_einsatz,
      spieltag_gewinn: entry.spieltag_gewinn,
      spieltag_saldo,
      gesamt_saldo: gesamtsieg_saldo + spieltag_saldo + zahlungenSaldo,
    }
  })

  return balances.sort((a, b) => a.name.localeCompare(b.name))
}

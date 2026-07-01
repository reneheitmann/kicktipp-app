import type { SeasonParticipant, Transaction, Zahlung } from '../../types/database'

export interface AccountBalance {
  beitraegeGesamtsieg: number
  beitraegeSpieltag: number
  beitraegeGesamt: number
  einzahlungenGesamt: number
  auszahlungenGesamt: number
  gewinneGesamt: number
  offen: number
}

/**
 * Kontostand eines Spielers, auf Basis der übergebenen (vom Aufrufer ggf.
 * bereits auf eine einzelne Saison gefilterten) Daten. Der Spieltags-Beitrag
 * ergibt sich bewusst aus Formel (Standard-Spieltagseinsatz × Anzahl der in
 * der jeweiligen Saison angelegten Spieltage), nicht aus der Summe einzelner
 * matchday_entries – so ist der volle erwartete Saison-Beitrag sofort
 * sichtbar, auch wenn z. B. noch nicht alle Spieltage angelegt wurden.
 * Bereits abgerechnete Gewinne (gewinn_gesamt/gewinn_spieltag aus dem
 * Buchungs-Ledger) mindern zusammen mit Einzahlungen die Restschuld;
 * Guthaben-Auszahlungen (bereits an den Spieler ausgezahlte Gewinne/
 * Überschüsse) erhöhen sie wieder, da der ausgezahlte Betrag nicht mehr als
 * Guthaben gegen künftige Beiträge zur Verfügung steht.
 * `offen > 0` heißt: Spieler schuldet noch Geld; `offen < 0` heißt: Spieler
 * hat (durch Einzahlungen und/oder noch nicht ausgezahlte Gewinne) mehr als
 * nötig beglichen.
 */
export function computeAccountBalance(
  participants: SeasonParticipant[],
  matchdayCountsBySeasonId: Map<string, number>,
  zahlungen: Zahlung[],
  transactions: Transaction[] = [],
): AccountBalance {
  const beitraegeGesamtsieg = participants.reduce((sum, p) => sum + p.gesamtsieg_einsatz_betrag, 0)
  const beitraegeSpieltag = participants.reduce((sum, p) => {
    const anzahlSpieltage = matchdayCountsBySeasonId.get(p.season_id) ?? 0
    return sum + p.spieltags_einsatz_betrag * anzahlSpieltage
  }, 0)
  const beitraegeGesamt = beitraegeGesamtsieg + beitraegeSpieltag
  const einzahlungenGesamt = zahlungen.filter((z) => z.typ === 'einzahlung').reduce((sum, z) => sum + z.betrag, 0)
  const auszahlungenGesamt = zahlungen.filter((z) => z.typ === 'auszahlung').reduce((sum, z) => sum + z.betrag, 0)
  const gewinneGesamt = transactions
    .filter((t) => t.typ === 'gewinn_gesamt' || t.typ === 'gewinn_spieltag')
    .reduce((sum, t) => sum + t.betrag, 0)
  return {
    beitraegeGesamtsieg,
    beitraegeSpieltag,
    beitraegeGesamt,
    einzahlungenGesamt,
    auszahlungenGesamt,
    gewinneGesamt,
    offen: beitraegeGesamt - einzahlungenGesamt - gewinneGesamt + auszahlungenGesamt,
  }
}

/** Summe aller positiven offenen Beträge (Schulden) über die angegebenen Spieler hinweg. */
export function computeTotalOutstanding(
  playerIds: string[],
  participants: SeasonParticipant[],
  matchdayCountsBySeasonId: Map<string, number>,
  zahlungen: Zahlung[],
  transactions: Transaction[],
): number {
  return playerIds.reduce((sum, playerId) => {
    const balance = computeAccountBalance(
      participants.filter((p) => p.player_id === playerId),
      matchdayCountsBySeasonId,
      zahlungen.filter((z) => z.player_id === playerId),
      transactions.filter((t) => t.player_id === playerId),
    )
    return sum + Math.max(balance.offen, 0)
  }, 0)
}

import type { Cents } from '../../lib/money'
import type { Transaction, Zahlung } from '../../types/database'

export interface AccountBalance {
  beitraegeGesamtsieg: Cents
  beitraegeSpieltag: Cents
  beitraegeGesamt: Cents
  einzahlungenGesamt: Cents
  auszahlungenGesamt: Cents
  gewinneGesamt: Cents
  korrekturGesamt: Cents
  offen: Cents
}

/**
 * Kontostand eines Spielers, auf Basis der übergebenen (vom Aufrufer ggf.
 * bereits auf eine einzelne Saison gefilterten) Daten. Die Beiträge
 * (Gesamtwertung wie Spieltag) ergeben sich aus der Summe der tatsächlich
 * gebuchten einsatz_gesamt/einsatz_spieltag-Transaktionen – die entstehen
 * automatisch per DB-Trigger aus season_participants/matchday_entries
 * (siehe 0004_einsaetze.sql), spiegeln also exakt die real angelegten
 * Teilnahmen/Einträge wider. Ein erst später eingestiegener Spieler hat
 * dadurch automatisch weniger einsatz_spieltag-Buchungen als ein Spieler,
 * der von Anfang an dabei war – keine gesonderte Behandlung nötig (bis
 * Anfang 2026 wurde hier stattdessen eine Formel verwendet,
 * Standardeinsatz × Gesamtzahl angelegter Spieltage, die auch Spieltage vor
 * dem Beitritt mitzählte).
 * Bereits abgerechnete Gewinne (gewinn_gesamt/gewinn_spieltag aus dem
 * Buchungs-Ledger) mindern zusammen mit Einzahlungen die Restschuld;
 * Guthaben-Auszahlungen (bereits an den Spieler ausgezahlte Gewinne/
 * Überschüsse) erhöhen sie wieder, da der ausgezahlte Betrag nicht mehr als
 * Guthaben gegen künftige Beiträge zur Verfügung steht. `korrektur`-Buchungen
 * (u. a. Saison-Übertrag, siehe transferApi.ts) wirken wie Gewinne: ein
 * positiver Betrag mindert die Restschuld, ein negativer erhöht sie – so
 * gleicht ein Übertrag die Quell-Saison exakt auf 0 aus und baut in der
 * Ziel-Saison denselben Betrag als Startsaldo neu auf.
 * `offen > 0` heißt: Spieler schuldet noch Geld; `offen < 0` heißt: Spieler
 * hat (durch Einzahlungen und/oder noch nicht ausgezahlte Gewinne) mehr als
 * nötig beglichen.
 *
 * Alle Beträge sind ganze Cent (`Cents`, siehe src/lib/money.ts und
 * balanceCalculations.ts), nicht Euro-Floats – vermeidet Fließkomma-Drift
 * bei der Summierung vieler Einzelbuchungen.
 */
export function computeAccountBalance(
  zahlungen: Zahlung[],
  transactions: Transaction[] = [],
): AccountBalance {
  const beitraegeGesamtsieg = transactions.filter((t) => t.typ === 'einsatz_gesamt').reduce((sum, t) => sum + t.betrag, 0)
  const beitraegeSpieltag = transactions.filter((t) => t.typ === 'einsatz_spieltag').reduce((sum, t) => sum + t.betrag, 0)
  const beitraegeGesamt = beitraegeGesamtsieg + beitraegeSpieltag
  const einzahlungenGesamt = zahlungen.filter((z) => z.typ === 'einzahlung').reduce((sum, z) => sum + z.betrag, 0)
  const auszahlungenGesamt = zahlungen.filter((z) => z.typ === 'auszahlung').reduce((sum, z) => sum + z.betrag, 0)
  const gewinneGesamt = transactions
    .filter((t) => t.typ === 'gewinn_gesamt' || t.typ === 'gewinn_spieltag')
    .reduce((sum, t) => sum + t.betrag, 0)
  const korrekturGesamt = transactions.filter((t) => t.typ === 'korrektur').reduce((sum, t) => sum + t.betrag, 0)
  return {
    beitraegeGesamtsieg,
    beitraegeSpieltag,
    beitraegeGesamt,
    einzahlungenGesamt,
    auszahlungenGesamt,
    gewinneGesamt,
    korrekturGesamt,
    offen: beitraegeGesamt - einzahlungenGesamt - gewinneGesamt - korrekturGesamt + auszahlungenGesamt,
  }
}

/** Summe aller positiven offenen Beträge (Schulden) über die angegebenen Spieler hinweg. */
export function computeTotalOutstanding(playerIds: string[], zahlungen: Zahlung[], transactions: Transaction[]): Cents {
  return playerIds.reduce((sum, playerId) => {
    const balance = computeAccountBalance(
      zahlungen.filter((z) => z.player_id === playerId),
      transactions.filter((t) => t.player_id === playerId),
    )
    return sum + Math.max(balance.offen, 0)
  }, 0)
}

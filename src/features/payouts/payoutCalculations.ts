import type { Cents } from '../../lib/money'

export const SUM_TOLERANCE = 0.01

/** Wandelt eine Prozent-Eingabe in eine Zahl um, akzeptiert sowohl Komma- als
 * auch Punkt-Dezimaltrennzeichen (deutsche Tastatur/Locale-Eingabe). */
export function parsePercent(value: string): number {
  return Number(value.replace(',', '.'))
}

/**
 * Cent-Beträge je Platz aus den (ggf. noch in Bearbeitung befindlichen)
 * Prozentsätzen, gegen den Gesamttopf gerechnet. Da jeder Platz einzeln
 * gerundet wird, könnte die Summe der gerundeten Beträge den Topf (100 %)
 * um Rundungscents über- oder unterschreiten – der unterste Gewinnrang
 * bekommt daher den exakten Rest, sodass die angezeigte Summe nie über dem
 * Topf liegt.
 *
 * Deckt nur die Prozent->Cent-Aufteilung der Gewinnverteilungs-Vorschau ab.
 * Die eigentliche, Gleichstand-fähige Gewinnberechnung (mehrere Spieler auf
 * demselben Platz teilen sich die Ränge, die sie "verbrauchen") läuft
 * serverseitig in Postgres (calculate_matchday_payout()/
 * calculate_season_payout(), siehe supabase/migrations/0012_tie_aware_payout_calculation.sql)
 * und ist damit kein Bestandteil dieser reinen Frontend-Funktion.
 */
export function computeAmounts(percents: number[], pool: Cents): Cents[] {
  const naive = percents.map((pct) => Math.round((pool * pct) / 100))
  return naive.map((amount, i) => {
    if (i < naive.length - 1) return amount
    const sumOthers = naive.slice(0, -1).reduce((s, a) => s + a, 0)
    return pool - sumOthers
  })
}

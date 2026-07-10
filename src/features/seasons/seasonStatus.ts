import type { SeasonStatus } from '../../types/database'

export const SEASON_STATUS_LABELS: Record<SeasonStatus, string> = {
  entwurf: 'Entwurf',
  aktiv: 'Aktiv',
  abgeschlossen: 'Abgeschlossen',
  archiviert: 'Archiviert',
}

// DESIGN.md: Statusfarben (Grün/Amber/Rot) sind für Geld-Zustände reserviert,
// nicht dekorativ – daher bewusst nur "positive" (aktiv) vs. "neutral" (alle
// drei übrigen), keine neue Farbe für Entwurf/Archiviert.
export const SEASON_STATUS_TONE: Record<SeasonStatus, 'positive' | 'neutral'> = {
  entwurf: 'neutral',
  aktiv: 'positive',
  abgeschlossen: 'neutral',
  archiviert: 'neutral',
}

/** Nur Entwurf/Archiviert werden aus saisonübergreifenden Geld-Summen
 * ausgeklammert (Dashboard, Konten-Übersicht, Saisonvergleich) – eine
 * explizit aufgerufene Einzelsaison zeigt ihre eigenen Zahlen unabhängig
 * davon weiterhin an, siehe SeasonDetailPage.tsx/SeasonBalancesPage.tsx. */
export function isSeasonBalanceEligible(status: SeasonStatus): boolean {
  return status === 'aktiv' || status === 'abgeschlossen'
}

/** Nur diese Status erlauben noch Änderungen an Teilnehmern, Gewinnregelung
 * und Spieltagen (siehe Migration 0045: DB-seitig per Trigger erzwungen,
 * hier nur für die UI-seitige Sperre). */
export function isSeasonLocked(status: SeasonStatus): boolean {
  return status === 'abgeschlossen' || status === 'archiviert'
}

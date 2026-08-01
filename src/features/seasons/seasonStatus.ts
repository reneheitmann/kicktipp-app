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

/** Entwurf/Archiviert werden aus saisonübergreifenden Geld-Summen
 * ausgeklammert (Dashboard, Konten-Übersicht, Saisonvergleich, Spieler-
 * Detail) – eine explizit aufgerufene Einzelsaison zeigt ihre eigenen Zahlen
 * unabhängig davon weiterhin an, siehe SeasonDetailPage.tsx/
 * SeasonBalancesPage.tsx. Ausnahme: wer Konten verwalten darf
 * (accounts.manage, siehe useAuth().can), muss Zahlungen/Auszahlungen einer
 * Entwurf-Saison bereits während der Vorbereitung sehen können, um sie dort
 * erfassen/prüfen zu können – Archiviert bleibt für alle ausgeklammert
 * (abgeschlossen und bewusst aus laufenden Aggregaten entfernt). */
export function isSeasonBalanceEligible(status: SeasonStatus, canManageAccounts: boolean): boolean {
  if (status === 'aktiv' || status === 'abgeschlossen') return true
  return canManageAccounts && status === 'entwurf'
}

/** Nur diese Status erlauben noch Änderungen an Teilnehmern, Gewinnregelung
 * und Spieltagen (siehe Migration 0045: DB-seitig per Trigger erzwungen,
 * hier nur für die UI-seitige Sperre). */
export function isSeasonLocked(status: SeasonStatus): boolean {
  return status === 'abgeschlossen' || status === 'archiviert'
}

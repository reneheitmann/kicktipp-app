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

import type { PermissionKey } from '../../types/database'

export interface PermissionCatalogEntry {
  key: PermissionKey
  label: string
  page: string
  description: string
}

// Einzige Quelle für Beschriftung/Gruppierung der konfigurierbaren Rechte –
// sowohl für die "Rollen & Berechtigungen"-Seite als auch als Referenz für
// can()-Aufrufe im restlichen Code (immer über PermissionKey, nie als
// String-Literal), damit auf einen Blick erkennbar ist, welches Recht auf
// welcher Seite greift. Die page.*.view-Einträge steuern die Sichtbarkeit
// der jeweiligen Seite selbst (Menüpunkt + Route), die übrigen Einträge
// steuern einzelne Aktionen innerhalb einer Seite.
export const permissionCatalog: PermissionCatalogEntry[] = [
  {
    key: 'seasons.manage',
    label: 'Saisons verwalten',
    page: 'Saisons',
    description: 'Anlegen, Bearbeiten, Kopieren, Löschen, Status ändern (inkl. Gesamtwertung abrechnen/öffnen).',
  },
  {
    key: 'matchdays.manage',
    label: 'Spieltage verwalten',
    page: 'Saison-Detail',
    description: 'Spieltage anlegen, bearbeiten, Status ändern, löschen.',
  },
  {
    key: 'participants.manage',
    label: 'Teilnehmer & Einsätze',
    page: 'Saison-Detail',
    description: 'Saison-Teilnehmer samt Gesamtwertung-/Standard-Spieltagseinsatz verwalten.',
  },
  {
    key: 'matchday_entries.manage',
    label: 'Spieltags-Einsätze',
    page: 'Spieltag-Detail',
    description: 'Einsätze je Spieltag erfassen/ändern, fehlende Teilnehmer nachtragen.',
  },
  {
    key: 'payouts.manage',
    label: 'Gewinnverteilung konfigurieren',
    page: 'Saison-Detail',
    description: 'Prozent-Verteilung je Platz für Gesamtwertung und Spieltag.',
  },
  {
    key: 'rankings.manage',
    label: 'Platzierungen & Gewinnberechnung',
    page: 'Gesamtwertung / Spieltag-Detail',
    description: 'Platzierungen erfassen und Gewinne berechnen (auch beim Übernehmen eines Kicktipp-Imports).',
  },
  {
    key: 'players.manage',
    label: 'Spieler verwalten',
    page: 'Spieler',
    description: 'Spieler anlegen, bearbeiten, löschen.',
  },
  {
    key: 'accounts.manage',
    label: 'Konten & Zahlungen',
    page: 'Konten / Spieler-Detail',
    description: 'Zahlungen erfassen/löschen, alle Kontostände einsehen.',
  },
  {
    key: 'balance_transfer.manage',
    label: 'Saldo-Übertrag zwischen Saisons',
    page: 'Spieler-Detail',
    description: 'Offenen Saldo eines Spielers in eine andere Saison übertragen.',
  },
  {
    key: 'import.use',
    label: 'Kicktipp-Import nutzen',
    page: 'Import',
    description: 'Kicktipp-Datenexporte hochladen und prüfen.',
  },
  {
    key: 'email.send',
    label: 'E-Mails versenden',
    page: 'E-Mail versenden',
    description: 'Bulk-E-Mails an Spieler senden (Empfängerauswahl, Vorlagen verwalten).',
  },
  {
    key: 'page.dashboard.view',
    label: 'Seite sichtbar',
    page: 'Übersicht',
    description: 'Blendet die Übersichtsseite (Startseite nach dem Login) im Menü und als Route komplett aus.',
  },
  {
    key: 'page.seasons.view',
    label: 'Seite sichtbar',
    page: 'Saisons',
    description:
      'Blendet Saisons-Liste, Saison-Detail, Gesamtwertung, Spieltag-Detail und Guthaben im Menü und als Route komplett aus.',
  },
  {
    key: 'page.vergleich.view',
    label: 'Seite sichtbar',
    page: 'Vergleich',
    description: 'Blendet den Saisonvergleich im Menü und als Route komplett aus.',
  },
  {
    key: 'page.players.view',
    label: 'Seite sichtbar',
    page: 'Spieler',
    description: 'Blendet die Spieler-Verwaltung im Menü und als Route zusätzlich zum Recht "Spieler verwalten" aus.',
  },
  {
    key: 'page.accounts.view',
    label: 'Seite sichtbar',
    page: 'Konten / Spieler-Detail',
    description: 'Blendet die Konten-Übersicht im Menü und als Route zusätzlich zum Recht "Konten & Zahlungen" aus.',
  },
  {
    key: 'page.import.view',
    label: 'Seite sichtbar',
    page: 'Import',
    description: 'Blendet den Kicktipp-Import im Menü und als Route zusätzlich zum Recht "Kicktipp-Import nutzen" aus.',
  },
  {
    key: 'page.email_send.view',
    label: 'Seite sichtbar',
    page: 'E-Mail versenden',
    description: 'Blendet den E-Mail-Versand im Menü und als Route zusätzlich zum Recht "E-Mails versenden" aus.',
  },
]

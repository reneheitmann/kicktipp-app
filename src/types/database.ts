export type UserRole = 'admin' | 'spielleiter' | 'user'

// Die konfigurierbaren Rechte, siehe supabase/migrations/0022_role_permissions.sql
// (Basis), 0024_email_send_permission_and_templates.sql (email.send),
// 0029_page_visibility.sql (page.*.view) und
// src/features/permissions/permissionCatalog.ts (dort mit Label/Seite/Beschreibung).
// Benutzerverwaltung, E-Mail-Einstellungen (SMTP), dieses Modul selbst und
// Erscheinungsbild bleiben bewusst außerhalb dieses Katalogs (hart admin-only,
// siehe Migrationskommentar in 0029).
//
// page.*.view steuert die Sichtbarkeit einer ganzen Seite (Menüpunkt +
// Route), unabhängig von den *.manage/*.use/email.send-Aktionsrechten – für
// Seiten mit bereits bestehendem Aktionsrecht (Spieler/Konten/Import/
// E-Mail versenden) verknüpfen navItems.ts/ProtectedRoute.tsx beide mit UND.
export type PermissionKey =
  | 'seasons.manage'
  | 'matchdays.manage'
  | 'participants.manage'
  | 'matchday_entries.manage'
  | 'payouts.manage'
  | 'rankings.manage'
  | 'players.manage'
  | 'accounts.manage'
  | 'balance_transfer.manage'
  | 'import.use'
  | 'email.send'
  | 'page.dashboard.view'
  | 'page.seasons.view'
  | 'page.vergleich.view'
  | 'page.players.view'
  | 'page.accounts.view'
  | 'page.import.view'
  | 'page.email_send.view'

export type RolePermission = {
  role: UserRole
  permission_key: PermissionKey
  granted: boolean
  updated_at: string
  updated_by: string | null
}

// Bewusst `type` statt `interface`: postgrest-js' Typinferenz für insert()/update()
// kollabiert auf `never`, wenn der Row-Typ als `interface` deklariert ist.
export type Profile = {
  id: string
  name: string
  email: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export type Player = {
  id: string
  profile_id: string | null
  name: string
  kicktipp_name: string | null
  created_at: string
}

export type SeasonStatus = 'aktiv' | 'abgeschlossen'

// Wiederverwendet für die Gesamtwertung, siehe Season.gesamtwertung_status:
// dieselbe offen/abgerechnet-Semantik wie ein einzelner Spieltag.
export type GesamtwertungStatus = MatchdayStatus

export type Season = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: SeasonStatus
  gesamtwertung_status: GesamtwertungStatus
  created_at: string
}

export type MatchdayStatus = 'offen' | 'abgerechnet'

export type Matchday = {
  id: string
  season_id: string
  nummer: number
  datum: string | null
  status: MatchdayStatus
  created_at: string
}

export type SeasonParticipant = {
  id: string
  season_id: string
  player_id: string
  gesamtsieg_einsatz_betrag: number
  spieltags_einsatz_betrag: number
  created_at: string
}

export type MatchdayEntry = {
  id: string
  matchday_id: string
  player_id: string
  spieltags_einsatz_betrag: number
  created_at: string
}

export type TransactionTyp = 'einsatz_gesamt' | 'einsatz_spieltag' | 'gewinn_gesamt' | 'gewinn_spieltag' | 'korrektur'

export type Transaction = {
  id: string
  player_id: string
  season_id: string
  matchday_id: string | null
  typ: TransactionTyp
  betrag: number
  datum: string
  notiz: string | null
  source_season_participant_id: string | null
  source_matchday_entry_id: string | null
  created_at: string
}

export type PayoutTyp = 'spieltag' | 'gesamtsieg'

export type PayoutRule = {
  id: string
  season_id: string
  typ: PayoutTyp
  rang: number
  prozent_anteil: number
  created_at: string
}

export type PayoutRuleInput = {
  rang: number
  prozent_anteil: number
}

export type MatchdayRanking = {
  id: string
  matchday_id: string
  player_id: string
  rang: number
  created_at: string
}

export type SeasonRanking = {
  id: string
  season_id: string
  player_id: string
  rang: number
  created_at: string
}

export type KicktippImportStatus = 'geprueft' | 'uebernommen'

export type KicktippImportRohdaten = {
  headers: string[]
  rows: string[][]
  nameColumn: number
  rangColumn: number
}

export type KicktippImport = {
  id: string
  season_id: string
  matchday_id: string | null
  uploaded_at: string
  uploaded_by: string | null
  rohdaten: KicktippImportRohdaten
  status: KicktippImportStatus
  created_at: string
}

export type ZahlungTyp = 'einzahlung' | 'auszahlung'

export type Zahlung = {
  id: string
  player_id: string
  season_id: string
  typ: ZahlungTyp
  betrag: number
  datum: string
  notiz: string | null
  created_by: string | null
  created_at: string
}

// Wiederverwendbare Vorlage für den Bulk-E-Mail-Versand an Spieler (nicht zu
// verwechseln mit EmailSettings, das die SMTP-Zugangsdaten hält). body_text
// und subject enthalten Variablen-Tokens ({{Spielername}} etc.), siehe
// src/features/emails/templateVariables.ts.
export type EmailTemplate = {
  id: string
  name: string
  subject: string
  body_text: string
  created_at: string
  updated_at: string
  created_by: string | null
}

// Zur Laufzeit änderbares App-Branding (Anzeigename, Icon, Primärfarbe),
// siehe src/features/app-settings/. Anders als alle anderen Settings-
// Tabellen per RLS öffentlich lesbar (auch vor dem Login), da LoginPage.tsx
// Name/Icon schon vor der Anmeldung anzeigt.
export type AppSettings = {
  id: string
  app_name: string
  icon_url: string | null
  primary_color: string
  updated_at: string
  updated_by: string | null
}

export type SmtpEncryption = 'none' | 'starttls' | 'tls'

export type EmailSettings = {
  id: string
  smtp_host: string
  smtp_port: number
  smtp_username: string | null
  smtp_password: string | null
  smtp_encryption: SmtpEncryption
  sender_email: string
  sender_name: string | null
  updated_at: string
  updated_by: string | null
}

// Für die Anzeige im Admin-Formular: das SMTP-Passwort wird beim Lesen nie ans
// Frontend übertragen (siehe emailSettingsApi.ts) – ein leeres Passwortfeld beim
// Speichern bedeutet "unverändert lassen", nicht "Passwort löschen".
export type EmailSettingsSafe = Omit<EmailSettings, 'smtp_password'> & { has_password: boolean }

// Form folgt absichtlich dem Schema, das `supabase gen types typescript` erzeugt,
// damit ein späterer Wechsel auf generierte Typen keine Anpassungen im restlichen Code erfordert.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          name: string
          email?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      players: {
        Row: Player
        Insert: {
          id?: string
          profile_id?: string | null
          name: string
          kicktipp_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          name?: string
          kicktipp_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: Season
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date: string
          status?: SeasonStatus
          gesamtwertung_status?: GesamtwertungStatus
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string
          status?: SeasonStatus
          gesamtwertung_status?: GesamtwertungStatus
          created_at?: string
        }
        Relationships: []
      }
      matchdays: {
        Row: Matchday
        Insert: {
          id?: string
          season_id: string
          nummer: number
          datum?: string | null
          status?: MatchdayStatus
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          nummer?: number
          datum?: string | null
          status?: MatchdayStatus
          created_at?: string
        }
        Relationships: []
      }
      season_participants: {
        Row: SeasonParticipant
        Insert: {
          id?: string
          season_id: string
          player_id: string
          gesamtsieg_einsatz_betrag: number
          spieltags_einsatz_betrag?: number
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          player_id?: string
          gesamtsieg_einsatz_betrag?: number
          spieltags_einsatz_betrag?: number
          created_at?: string
        }
        Relationships: []
      }
      matchday_entries: {
        Row: MatchdayEntry
        Insert: {
          id?: string
          matchday_id: string
          player_id: string
          spieltags_einsatz_betrag: number
          created_at?: string
        }
        Update: {
          id?: string
          matchday_id?: string
          player_id?: string
          spieltags_einsatz_betrag?: number
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: Transaction
        Insert: {
          id?: string
          player_id: string
          season_id: string
          matchday_id?: string | null
          typ: TransactionTyp
          betrag: number
          datum?: string
          notiz?: string | null
          source_season_participant_id?: string | null
          source_matchday_entry_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          season_id?: string
          matchday_id?: string | null
          typ?: TransactionTyp
          betrag?: number
          datum?: string
          notiz?: string | null
          source_season_participant_id?: string | null
          source_matchday_entry_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payout_rules: {
        Row: PayoutRule
        Insert: {
          id?: string
          season_id: string
          typ: PayoutTyp
          rang: number
          prozent_anteil: number
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          typ?: PayoutTyp
          rang?: number
          prozent_anteil?: number
          created_at?: string
        }
        Relationships: []
      }
      matchday_rankings: {
        Row: MatchdayRanking
        Insert: {
          id?: string
          matchday_id: string
          player_id: string
          rang: number
          created_at?: string
        }
        Update: {
          id?: string
          matchday_id?: string
          player_id?: string
          rang?: number
          created_at?: string
        }
        Relationships: []
      }
      season_rankings: {
        Row: SeasonRanking
        Insert: {
          id?: string
          season_id: string
          player_id: string
          rang: number
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          player_id?: string
          rang?: number
          created_at?: string
        }
        Relationships: []
      }
      kicktipp_imports: {
        Row: KicktippImport
        Insert: {
          id?: string
          season_id: string
          matchday_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          rohdaten: KicktippImportRohdaten
          status?: KicktippImportStatus
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          matchday_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          rohdaten?: KicktippImportRohdaten
          status?: KicktippImportStatus
          created_at?: string
        }
        Relationships: []
      }
      zahlungen: {
        Row: Zahlung
        Insert: {
          id?: string
          player_id: string
          season_id: string
          typ?: ZahlungTyp
          betrag: number
          datum?: string
          notiz?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          season_id?: string
          typ?: ZahlungTyp
          betrag?: number
          datum?: string
          notiz?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: EmailSettings
        Insert: {
          id?: string
          smtp_host: string
          smtp_port: number
          smtp_username?: string | null
          smtp_password?: string | null
          smtp_encryption?: SmtpEncryption
          sender_email: string
          sender_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          smtp_host?: string
          smtp_port?: number
          smtp_username?: string | null
          smtp_password?: string | null
          smtp_encryption?: SmtpEncryption
          sender_email?: string
          sender_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: AppSettings
        Insert: {
          id?: string
          app_name?: string
          icon_url?: string | null
          primary_color?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          app_name?: string
          icon_url?: string | null
          primary_color?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: RolePermission
        Insert: {
          role: UserRole
          permission_key: PermissionKey
          granted?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          role?: UserRole
          permission_key?: PermissionKey
          granted?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: EmailTemplate
        Insert: {
          id?: string
          name: string
          subject: string
          body_text: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          body_text?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      set_payout_rules: {
        Args: {
          p_season_id: string
          p_typ: PayoutTyp
          p_rules: PayoutRuleInput[]
        }
        Returns: PayoutRule[]
      }
      calculate_matchday_payout: {
        Args: { p_matchday_id: string }
        Returns: Transaction[]
      }
      calculate_season_payout: {
        Args: { p_season_id: string }
        Returns: Transaction[]
      }
      remove_matchday_ranking: {
        Args: { p_ranking_id: string }
        Returns: undefined
      }
      remove_season_ranking: {
        Args: { p_ranking_id: string }
        Returns: undefined
      }
      reset_season_rankings: {
        Args: { p_season_id: string }
        Returns: undefined
      }
      copy_season: {
        Args: {
          p_source_season_id: string
          p_new_name: string
          p_new_start_date: string
          p_new_end_date: string
          p_copy_payout_rules?: boolean
          p_copy_players?: boolean
          p_copy_matchdays?: boolean
        }
        Returns: string
      }
      transfer_balance_to_season: {
        Args: {
          p_player_id: string
          p_from_season_id: string
          p_to_season_id: string
          p_betrag: number
          p_notiz?: string | null
        }
        Returns: undefined
      }
      get_payout_pool: {
        Args: { p_season_id: string; p_typ: PayoutTyp }
        Returns: number
      }
    }
  }
}

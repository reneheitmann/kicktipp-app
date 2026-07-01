export type UserRole = 'admin' | 'spielleiter' | 'user'

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

export type Season = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: SeasonStatus
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
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string
          status?: SeasonStatus
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
    }
  }
}

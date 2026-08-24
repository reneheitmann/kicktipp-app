#!/usr/bin/env node
// Erzeugt dist/instance-info.json – das Minimum an Verbindungsdaten, das die
// mobile App (siehe mobile/, docs/mobile-app.md) braucht, um eine vom Nutzer
// eingegebene Domain zu einem nutzbaren Supabase-Client aufzulösen, BEVOR
// überhaupt eine Anmeldung stattfindet. Läuft nach `vite build` für main/beta
// (siehe docker-publish.yml) – dieselben Env-Variablen, die den Web-Build
// ohnehin schon zur Build-Zeit konfigurieren, kein neues Secret nötig: der
// Anon-Key ist bereits öffentlich im Web-Bundle enthalten.
//
// Bewusst NICHT für den mobile-Build selbst aufgerufen (dort gibt es keine
// build-zeit-feste VITE_SUPABASE_URL/-ANON_KEY, siehe supabaseClient.ts) –
// nur für main/beta, deren Ergebnis andere Instanzen dann per HTTPS abrufen.

import { writeFileSync, mkdirSync } from 'node:fs'

const distDir = process.argv[2] ?? 'dist'
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen – instance-info.json kann nicht erzeugt werden.')
  process.exit(1)
}

// Echter, admin-konfigurierter App-Name (siehe AppSettingsPage.tsx
// "Erscheinungsbild", app_settings-Tabelle) statt eines generischen
// Platzhalters - Stand zum Build-Zeitpunkt, danach lädt die App nach dem
// Verbinden ohnehin live über AppBrandingProvider nach. Fällt bei jedem
// Fehler (z. B. DB kurz nicht erreichbar) auf denselben Default wie
// AppSettingsPage.tsx (DEFAULT_APP_NAME) zurück, statt den Build scheitern
// zu lassen - reiner Anzeige-Komfort, kein kritischer Wert.
const SETTINGS_ID = '00000000-0000-0000-0000-000000000002'
let defaultName = 'Kicktipp Spielrunde'
try {
  const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?id=eq.${SETTINGS_ID}&select=app_name`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
  })
  const rows = await res.json()
  if (res.ok && rows[0]?.app_name) defaultName = rows[0].app_name
} catch {
  // Fallback bleibt der generische Default, siehe Kommentar oben.
}

const info = {
  supabase_url: supabaseUrl,
  supabase_anon_key: supabaseAnonKey,
  default_name: defaultName,
}

mkdirSync(distDir, { recursive: true })
writeFileSync(`${distDir}/instance-info.json`, JSON.stringify(info, null, 2) + '\n')
console.log(`instance-info.json geschrieben nach ${distDir}/instance-info.json`)

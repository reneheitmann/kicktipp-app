import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendFcmPush } from './fcm.ts'
import { logAppError } from './logging.ts'

/**
 * Lädt alle push_tokens der angegebenen Profile und verschickt eine
 * Push-Nachricht an jedes registrierte Gerät (mehrere Tokens pro Profil
 * möglich, siehe 0069_push_tokens.sql). Läuft mit dem service_role-Key,
 * daher unabhängig von den push_tokens-RLS-Policies (die sind für Client-
 * Zugriff gedacht, nicht für diesen serverseitigen Versand). Tokens, die
 * FCM als nicht mehr registriert meldet, werden aufgeräumt.
 *
 * ponytail: Fehlgeschlagene Zustellungen (außer invalidToken) werden nur
 * geloggt, nicht erneut versucht – für den hier verlangten
 * Machbarkeitsnachweis (zwei Auslöser) ausreichend, ein Retry-/Queue-
 * Mechanismus wäre der Ausbaupfad, falls Push-Zustellung geschäftskritisch wird.
 */
export async function sendPushToProfiles(
  supabaseUrl: string,
  serviceRoleKey: string,
  source: string,
  profileIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (profileIds.length === 0) return

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: tokens, error } = await adminClient.from('push_tokens').select('id, token').in('profile_id', profileIds)
  if (error || !tokens || tokens.length === 0) return

  const results = await Promise.all(tokens.map((t) => sendFcmPush({ token: t.token, title, body, data })))

  const invalidTokenIds = tokens.filter((_, i) => results[i].invalidToken).map((t) => t.id)
  if (invalidTokenIds.length > 0) {
    await adminClient.from('push_tokens').delete().in('id', invalidTokenIds)
  }

  const failures = results.filter((r) => !r.ok && !r.invalidToken)
  if (failures.length > 0) {
    await logAppError(supabaseUrl, serviceRoleKey, source, 'Push-Zustellung teilweise fehlgeschlagen', {
      failures: failures.map((f) => f.error),
    })
  }

  // ponytail: temporäres Diagnose-Log für die volle FCM-Antwort (auch bei
  // Erfolg) - hilft zu unterscheiden, ob FCM die Nachricht wirklich zur
  // Zustellung angenommen hat oder ob der Fehler erst zwischen FCM und
  // APNs passiert (dort sichtbar wir nicht). Kandidat zum Entfernen,
  // sobald der aktuelle Zustellungs-Fall geklärt ist.
  await logAppError(
    supabaseUrl,
    serviceRoleKey,
    source,
    'Push-Zustellung Diagnose',
    { results: results.map((r) => ({ ok: r.ok, invalidToken: r.invalidToken, responseBody: r.responseBody })) },
    'warn',
  )
}

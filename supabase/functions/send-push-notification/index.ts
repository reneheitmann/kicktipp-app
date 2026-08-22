// Edge Function: Push-Auslöser Nr. 2 (siehe docs/mobile-app.md, Phase 5) –
// abgeschlossene Spieltags-Gewinnberechnung. Vom Client direkt NACH einem
// erfolgreichen calculate_matchday_payout()-Aufruf angesprochen (siehe
// RankingsSection.tsx/matchdayRankingsApi.ts), nicht bei jeder Ranking-
// Änderung.
//
// Bewusst KEIN generisches "sende Push an beliebige profile_ids mit
// beliebigem Titel/Text"-Interface: ein authentifizierter Client könnte
// damit sonst Push-Spam/Phishing an beliebige Nutzer auslösen. Diese
// Function nimmt stattdessen nur eine matchday_id entgegen, prüft
// serverseitig, dass für diesen Spieltag tatsächlich eine Gewinnberechnung
// abgeschlossen wurde (status = 'abgerechnet'), und ermittelt Empfänger +
// Nachrichtentext komplett selbst aus der DB - der Client kann weder
// Inhalt noch Empfänger beeinflussen.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeadersForOrigin } from '../_shared/cors.ts'
import { logAppError } from '../_shared/logging.ts'
import { sendPushToProfiles } from '../_shared/push.ts'

type JsonResponder = (body: unknown, status?: number) => Response

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForOrigin(req.headers.get('Origin'))
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin nicht erlaubt.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const jsonResponse: JsonResponder = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    return await handle(req, supabaseUrl, serviceRoleKey, jsonResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'send-push-notification', message)
    return jsonResponse({ error: `Unerwarteter Fehler: ${message}` }, 500)
  }
})

async function handle(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
  jsonResponse: JsonResponder,
): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401)
  }

  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: callerUser },
    error: callerError,
  } = await callerClient.auth.getUser()
  if (callerError || !callerUser) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401)
  }

  let body: { matchday_id?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }
  const matchdayId = body.matchday_id
  if (!matchdayId) {
    return jsonResponse({ error: 'matchday_id ist erforderlich.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: matchday, error: matchdayError } = await adminClient
    .from('matchdays')
    .select('id, nummer, status, season_id')
    .eq('id', matchdayId)
    .maybeSingle()
  if (matchdayError || !matchday || matchday.status !== 'abgerechnet') {
    // Kein Fehler-Response mit Details nach außen - der Aufrufer bekommt nur
    // "ok" bzw. eine generische Ablehnung, keine Bestätigung, ob eine
    // matchday_id existiert (kein Enumerations-Vektor).
    return jsonResponse({ ok: false }, 200)
  }

  const { data: season } = await adminClient.from('seasons').select('name').eq('id', matchday.season_id).maybeSingle()

  const { data: payoutTransactions, error: transactionsError } = await adminClient
    .from('transactions')
    .select('player_id')
    .eq('matchday_id', matchdayId)
    .eq('typ', 'gewinn_spieltag')
  if (transactionsError || !payoutTransactions || payoutTransactions.length === 0) {
    return jsonResponse({ ok: false }, 200)
  }

  const playerIds = [...new Set(payoutTransactions.map((t) => t.player_id))]
  const { data: links } = await adminClient.from('player_profile_links').select('profile_id').in('player_id', playerIds)
  const profileIds = [...new Set((links ?? []).map((l) => l.profile_id))]

  await sendPushToProfiles(
    supabaseUrl,
    serviceRoleKey,
    'send-push-notification',
    profileIds,
    'Gewinnberechnung abgeschlossen',
    `Dein Gewinn für Spieltag ${matchday.nummer}${season ? ` in ${season.name}` : ''} steht fest.`,
    { type: 'matchday_payout', season_id: matchday.season_id, matchday_id: matchdayId },
  )

  return jsonResponse({ ok: true })
}

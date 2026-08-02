// Edge Function: löscht einen Benutzer endgültig (auth.users + kaskadierend
// profiles, player_profile_links, active_sessions, password_history; alles
// andere per "on delete set null" - siehe 0060_email_settings_updated_by_set_null.sql
// für die eine zuvor fehlende Kaskade). Anders als Sperren (profiles.is_active)
// ist das unwiderruflich. Läuft serverseitig mit dem service_role-Key, da nur
// Supabase Auths privilegierte Admin-API einen Login wirklich löschen kann.
//
// Gleiches Delegations-Muster wie admin-create-user/admin-update-user: aktiver
// Admin ODER granulares users.manage-Recht. Wer kein echter Admin ist, darf
// dabei kein Admin-Konto löschen (wie bei admin-update-user), den letzten
// aktiven Admin nicht löschen und sich nicht selbst über diesen Weg löschen.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeadersForOrigin } from '../_shared/cors.ts'

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
    await logAppError(supabaseUrl, serviceRoleKey, 'admin-delete-user', message)
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

  const { data: callerProfile, error: profileError } = await callerClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile || !callerProfile.is_active) {
    return jsonResponse({ error: 'Nur aktive Administratoren dürfen Benutzer löschen.' }, 403)
  }

  const isAdmin = callerProfile.role === 'admin'
  let canManageUsers = isAdmin
  if (!isAdmin) {
    const { data: perm } = await callerClient
      .from('role_permissions')
      .select('granted')
      .eq('role', callerProfile.role)
      .eq('permission_key', 'users.manage')
      .maybeSingle()
    canManageUsers = perm?.granted === true
  }
  if (!canManageUsers) {
    return jsonResponse({ error: 'Keine Berechtigung, Benutzer zu löschen.' }, 403)
  }

  let body: { userId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const { userId } = body
  if (!userId?.trim()) {
    return jsonResponse({ error: 'Benutzer ist erforderlich.' }, 400)
  }

  if (userId === callerUser.id) {
    return jsonResponse({ error: 'Das eigene Konto kann nicht auf diesem Weg gelöscht werden.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: targetProfile, error: targetError } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .maybeSingle()
  if (targetError || !targetProfile) {
    return jsonResponse({ error: 'Benutzer nicht gefunden.' }, 404)
  }

  if (!isAdmin && targetProfile.role === 'admin') {
    return jsonResponse({ error: 'Nur Administratoren dürfen Administrator-Konten löschen.' }, 403)
  }

  if (targetProfile.role === 'admin' && targetProfile.is_active) {
    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true)
    if ((count ?? 0) <= 1) {
      return jsonResponse({ error: 'Der letzte aktive Administrator kann nicht gelöscht werden.' }, 400)
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 400)
  }

  return jsonResponse({ ok: true })
}

async function logAppError(
  supabaseUrl: string,
  serviceRoleKey: string,
  source: string,
  message: string,
  details?: Record<string, unknown>,
) {
  try {
    const client = createClient(supabaseUrl, serviceRoleKey)
    await client.from('app_logs').insert({ level: 'error', source, message, details: details ?? null })
  } catch {
    // Logging darf den eigentlichen Response-Pfad nicht zusätzlich zum Absturz bringen.
  }
}

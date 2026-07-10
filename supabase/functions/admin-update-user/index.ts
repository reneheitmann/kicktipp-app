// Edge Function: bearbeitet Name und E-Mail eines bestehenden Benutzers.
// Läuft serverseitig mit dem service_role-Key, da eine E-Mail-Änderung auch
// den Login (auth.users.email) betrifft – das kann nur die privilegierte
// Admin-API von Supabase Auth, nicht die profiles-Tabelle allein. Ohne diese
// Function würde profiles.email vom tatsächlichen Login-Namen abweichen.
// Prüft selbst, dass der Aufrufer ein aktiver Admin ist, analog zu
// admin-create-user.

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
    await logAppError(supabaseUrl, serviceRoleKey, 'admin-update-user', message)
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

  if (profileError || !callerProfile || callerProfile.role !== 'admin' || !callerProfile.is_active) {
    return jsonResponse({ error: 'Nur aktive Administratoren dürfen Benutzer bearbeiten.' }, 403)
  }

  let body: { userId?: string; name?: string; vorname?: string; nachname?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const { userId, name, vorname, nachname, email } = body
  if (!userId?.trim() || !name?.trim() || !email?.trim()) {
    return jsonResponse({ error: 'Benutzer, Name und E-Mail sind erforderlich.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const trimmedVorname = vorname?.trim() || null
  const trimmedNachname = nachname?.trim() || null

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
    email: email.trim(),
    user_metadata: { name: name.trim(), vorname: trimmedVorname, nachname: trimmedNachname },
  })
  if (updateAuthError) {
    return jsonResponse({ error: updateAuthError.message }, 400)
  }

  // handle_new_user() synchronisiert name/email nur bei INSERT, nicht bei
  // einer späteren Änderung – daher hier explizit auch profiles aktualisieren.
  const { error: updateProfileError } = await adminClient
    .from('profiles')
    .update({ name: name.trim(), vorname: trimmedVorname, nachname: trimmedNachname, email: email.trim() })
    .eq('id', userId)
  if (updateProfileError) {
    return jsonResponse({ error: updateProfileError.message }, 400)
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


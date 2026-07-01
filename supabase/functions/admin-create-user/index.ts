// Edge Function: legt einen neuen Supabase-Auth-User inkl. Profil an.
// Läuft serverseitig mit dem service_role-Key (nur als Function-Secret hinterlegt,
// niemals im Frontend-Bundle). Prüft selbst, dass der Aufrufer ein aktiver Admin ist,
// bevor er die privilegierte Admin-API von Supabase Auth verwendet.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ROLES = ['admin', 'spielleiter', 'user']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Der Browser schickt bei supabase.functions.invoke() wegen des
  // Authorization-Headers und application/json-Bodys vorab einen
  // CORS-Preflight (OPTIONS). Ohne Antwort darauf blockiert der Browser
  // den eigentlichen POST, bevor die Funktion ihn je sieht.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Client im Namen des Aufrufers, um dessen Identität/Rolle zu verifizieren.
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
    return jsonResponse({ error: 'Nur aktive Administratoren dürfen Benutzer anlegen.' }, 403)
  }

  let body: { name?: string; email?: string; password?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const { name, email, password, role } = body

  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return jsonResponse({ error: 'Name, E-Mail und Passwort (mind. 8 Zeichen) sind erforderlich.' }, 400)
  }
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return jsonResponse({ error: 'Ungültige Rolle.' }, 400)
  }

  // Admin-Client mit service_role, um den eigentlichen Auth-User anzulegen.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), role },
  })

  if (createError || !created.user) {
    return jsonResponse({ error: createError?.message ?? 'Anlegen fehlgeschlagen' }, 400)
  }

  // Der DB-Trigger handle_new_user() legt die profiles-Zeile automatisch an
  // (inkl. name/role aus user_metadata). Kein zusätzlicher Insert nötig.

  return jsonResponse({ id: created.user.id })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

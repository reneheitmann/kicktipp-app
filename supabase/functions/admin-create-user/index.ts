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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    return await handle(req, supabaseUrl, serviceRoleKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logAppError(supabaseUrl, serviceRoleKey, 'admin-create-user', message)
    return jsonResponse({ error: `Unerwarteter Fehler: ${message}` }, 500)
  }
})

async function handle(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401)
  }

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

  let body: {
    name?: string
    vorname?: string
    nachname?: string
    email?: string
    password?: string
    role?: string
    isGeneratedPlaceholder?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const { name, vorname, nachname, email, password, role, isGeneratedPlaceholder } = body

  if (!name?.trim() || !email?.trim() || !password) {
    return jsonResponse({ error: 'Name, E-Mail und Passwort sind erforderlich.' }, 400)
  }
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return jsonResponse({ error: 'Ungültige Rolle.' }, 400)
  }

  // Admin-Client mit service_role, um den eigentlichen Auth-User anzulegen.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Die Passwort-Richtlinie gilt nicht für den bei "Per E-Mail einladen"
  // clientseitig zufällig generierten Platzhalter (generateRandomPassword()):
  // der wird dem User nie angezeigt und sofort durch das per Reset-Link
  // selbst gewählte Passwort ersetzt – siehe CreateUserForm.tsx.
  if (!isGeneratedPlaceholder) {
    const { data: policy } = await adminClient.from('password_policy').select('*').limit(1).maybeSingle()
    const minLength = policy?.min_length ?? 8
    const minClasses = policy?.min_character_classes ?? 3

    if (password.length < minLength) {
      return jsonResponse({ error: `Passwort muss mindestens ${minLength} Zeichen lang sein.` }, 400)
    }
    if (countCharacterClasses(password) < minClasses) {
      return jsonResponse(
        {
          error: `Passwort muss mindestens ${minClasses} von 4 Zeichenarten enthalten (Großbuchstaben, Kleinbuchstaben, Zahlen, Sonderzeichen).`,
        },
        400,
      )
    }
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), vorname: vorname?.trim() || null, nachname: nachname?.trim() || null, role },
  })

  if (createError || !created.user) {
    return jsonResponse({ error: createError?.message ?? 'Anlegen fehlgeschlagen' }, 400)
  }

  // Der DB-Trigger handle_new_user() legt die profiles-Zeile automatisch an
  // (inkl. name/role aus user_metadata). Kein zusätzlicher Insert nötig.

  if (!isGeneratedPlaceholder) {
    const { error: historyError } = await adminClient.rpc('record_password_history', {
      p_user_id: created.user.id,
      p_password: password,
    })
    if (historyError) {
      await logAppError(supabaseUrl, serviceRoleKey, 'admin-create-user', historyError.message, {
        context: 'record_password_history',
      })
    }
  }

  return jsonResponse({ id: created.user.id })
}

function countCharacterClasses(password: string): number {
  let classes = 0
  if (/[A-Z]/.test(password)) classes++
  if (/[a-z]/.test(password)) classes++
  if (/[0-9]/.test(password)) classes++
  if (/[^A-Za-z0-9]/.test(password)) classes++
  return classes
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

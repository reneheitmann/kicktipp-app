// Edge Function: ändert das eigene Passwort des angemeldeten Users.
// Läuft serverseitig mit dem service_role-Key, da die Passwort-Richtlinie
// (Länge/Zeichenarten/Wiederverwendungssperre, siehe password_policy/
// password_history) nur dort durchsetzbar ist – der bisherige direkte
// Client-Aufruf supabase.auth.updateUser({ password }) hatte keinerlei
// serverseitige Prüfung und wird durch diesen Aufruf ersetzt
// (siehe src/features/auth/myAccountApi.ts).
//
// check_password_reuse/record_password_history sind bewusst nur für
// service_role ausführbar (siehe Migration 0032/0034) – diese Function ist
// deshalb der einzige Ort, an dem beide aufgerufen werden können.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
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
    await logAppError(supabaseUrl, serviceRoleKey, 'update-own-password', message)
    return jsonResponse({ error: `Unerwarteter Fehler: ${message}` }, 500)
  }
})

async function handle(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
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
    .select('is_active')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile || !callerProfile.is_active) {
    return jsonResponse({ error: 'Konto ist nicht aktiv.' }, 403)
  }

  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const password = body.password
  if (!password) {
    return jsonResponse({ error: 'Passwort ist erforderlich.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: policy } = await adminClient.from('password_policy').select('*').limit(1).maybeSingle()
  const minLength = policy?.min_length ?? 8
  const minClasses = policy?.min_character_classes ?? 3
  const reuseDays = policy?.reuse_days ?? 60

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

  if (reuseDays > 0) {
    const { data: wasReused, error: reuseError } = await adminClient.rpc('check_password_reuse', {
      p_user_id: callerUser.id,
      p_candidate: password,
    })
    if (reuseError) {
      throw new Error(reuseError.message)
    }
    if (wasReused) {
      return jsonResponse(
        { error: `Dieses Passwort wurde innerhalb der letzten ${reuseDays} Tage bereits verwendet.` },
        400,
      )
    }
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(callerUser.id, { password })
  if (updateError) {
    return jsonResponse({ error: updateError.message }, 400)
  }

  const { error: historyError } = await adminClient.rpc('record_password_history', {
    p_user_id: callerUser.id,
    p_password: password,
  })
  if (historyError) {
    // Passwort wurde bereits erfolgreich geändert – ein Fehler beim
    // Historie-Eintrag darf das dem User nicht als Fehlschlag melden, nur
    // fürs Support-Log festhalten.
    await logAppError(supabaseUrl, serviceRoleKey, 'update-own-password', historyError.message, {
      context: 'record_password_history',
    })
  }

  return jsonResponse({ ok: true })
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

// Edge Function: schließt eine per update-own-email angestoßene
// E-Mail-Änderung ab. Läuft absichtlich OHNE Auth-Check – der Besitz des
// per Mail zugestellten Tokens ist hier der Nachweis (identisches Prinzip
// wie Supabase's eigener Recovery-Link), nicht die aktuelle Session, da der
// Link auch in einem anderen Browser/Gerät geöffnet werden kann.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeadersForOrigin } from '../_shared/cors.ts'

const TOKEN_TTL_MS = 24 * 60 * 60_000

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForOrigin(req.headers.get('Origin'))
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: 'Origin nicht erlaubt.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const jsonResponse = (body: unknown, status = 200) =>
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
    await logAppError(supabaseUrl, serviceRoleKey, 'confirm-email-change', message)
    return jsonResponse({ error: `Unerwarteter Fehler: ${message}` }, 500)
  }
})

async function handle(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
  jsonResponse: (body: unknown, status?: number) => Response,
): Promise<Response> {
  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body' }, 400)
  }

  const token = body.token?.trim()
  if (!token) {
    return jsonResponse({ error: 'Link ist ungültig oder abgelaufen.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const tokenHash = await sha256Hex(token)

  const { data: request, error: requestError } = await adminClient
    .from('email_change_requests')
    .select('profile_id, new_email, requested_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (requestError || !request) {
    return jsonResponse({ error: 'Link ist ungültig oder abgelaufen.' }, 400)
  }

  const isExpired = Date.now() - new Date(request.requested_at).getTime() > TOKEN_TTL_MS
  if (isExpired) {
    await adminClient.from('email_change_requests').delete().eq('profile_id', request.profile_id)
    return jsonResponse({ error: 'Link ist ungültig oder abgelaufen.' }, 400)
  }

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(request.profile_id, {
    email: request.new_email,
  })
  if (updateAuthError) {
    return jsonResponse({ error: updateAuthError.message }, 400)
  }

  const { error: updateProfileError } = await adminClient
    .from('profiles')
    .update({ email: request.new_email })
    .eq('id', request.profile_id)
  if (updateProfileError) {
    return jsonResponse({ error: updateProfileError.message }, 500)
  }

  await adminClient.from('email_change_requests').delete().eq('profile_id', request.profile_id)

  return jsonResponse({ ok: true, email: request.new_email })
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
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

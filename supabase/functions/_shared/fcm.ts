// Firebase Cloud Messaging (HTTP v1 API) – ein Absender für iOS- und
// Android-Push-Tokens statt getrennter APNs-/FCM-Integrationen (iOS-Tokens
// lassen sich über FCM zustellen, sobald Firebase auf beiden Plattformen als
// Absender eingerichtet ist, siehe docs/mobile-app.md). Die alte, einfachere
// "Legacy"-FCM-HTTP-API (reiner Server-Key) ist von Google abgeschaltet;
// die aktuelle v1-API braucht einen OAuth2-Access-Token, den man mit dem
// Service-Account-Schlüssel selbst per JWT-Bearer-Flow holt (kein
// firebase-admin-SDK nötig, das für Deno/Edge Functions nicht gemacht ist –
// reines Web Crypto/fetch, keine neue Abhängigkeit).

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

function base64Url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
}

/** Holt einen kurzlebigen Google-OAuth2-Access-Token für den FCM-Scope (JWT-Bearer-Flow, RFC 7523). */
async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`
  const key = await importPrivateKey(account.private_key)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${base64Url(signature)}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!response.ok) {
    throw new Error(`Google-OAuth2-Token-Anfrage fehlgeschlagen: ${response.status} ${await response.text()}`)
  }
  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

export interface PushMessage {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

export interface PushResult {
  token: string
  ok: boolean
  /** true, wenn FCM das Token als ungültig/nicht mehr registriert meldet – Aufrufer sollte es aus push_tokens entfernen. */
  invalidToken: boolean
  error?: string
  /** Rohantwort von FCM (Erfolg wie Fehler) - für Diagnose, siehe sendPushToProfiles(). */
  responseBody?: string
}

/**
 * Verschickt eine Push-Nachricht über die FCM-HTTP-v1-API. `FCM_SERVICE_ACCOUNT_JSON`
 * (Function-Secret, JSON-Inhalt der Firebase-Service-Account-Datei) muss
 * gesetzt sein – siehe docs/mobile-app.md, Store-Checkliste.
 */
export async function sendFcmPush(message: PushMessage): Promise<PushResult> {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
  if (!raw) {
    return { token: message.token, ok: false, invalidToken: false, error: 'FCM_SERVICE_ACCOUNT_JSON ist nicht konfiguriert.' }
  }

  let account: ServiceAccount
  try {
    account = JSON.parse(raw)
  } catch {
    return { token: message.token, ok: false, invalidToken: false, error: 'FCM_SERVICE_ACCOUNT_JSON ist kein gültiges JSON.' }
  }

  try {
    const accessToken = await getAccessToken(account)
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: { title: message.title, body: message.body },
          data: message.data,
        },
      }),
    })

    if (response.ok) {
      return { token: message.token, ok: true, invalidToken: false, responseBody: await response.text() }
    }

    const errorBody = await response.text()
    // FCM meldet nicht mehr existierende/deinstallierte Registrierungen als
    // UNREGISTERED - genau diese sollen aus push_tokens entfernt werden,
    // andere Fehler (z. B. vorübergehende Serverfehler) nicht.
    const invalidToken = errorBody.includes('UNREGISTERED') || errorBody.includes('INVALID_ARGUMENT')
    return { token: message.token, ok: false, invalidToken, error: `FCM-Fehler ${response.status}: ${errorBody}`, responseBody: errorBody }
  } catch (err) {
    return { token: message.token, ok: false, invalidToken: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// Minimaler eigener SMTP-Client über rohe TCP-Sockets (Deno.connect/Deno.startTls).
//
// Grund für die Eigenimplementierung statt einer fertigen Library: die gängige
// Deno-SMTP-Bibliothek "denomailer" bringt die Supabase-Edge-Function-Isolate
// reproduzierbar zum Absturz (generisches 500 ohne jede Response, auch ohne
// CORS-Header), sobald in derselben Anfrage vorher schon ein fetch() gelaufen
// ist – z. B. für den Auth-Check des Aufrufers oder das Lesen der
// email_settings-Zeile, beides unvermeidbar für eine echte Funktion. Das wurde
// empirisch gegen das reale Supabase-Projekt verifiziert: reines Deno.connect()
// nach einem fetch() funktioniert dagegen einwandfrei, daher dieser schlanke,
// selbst geschriebene Client auf Basis von Deno.connect/Deno.connectTls/
// Deno.startTls statt einer Library, die genau das intern anders macht.

export interface SmtpConfig {
  hostname: string
  port: number
  encryption: 'none' | 'starttls' | 'tls'
  username?: string | null
  password?: string | null
}

export interface SmtpMessage {
  fromEmail: string
  fromName?: string | null
  to: string
  subject: string
  html: string
}

export class SmtpError extends Error {}

// Sehr konservative Prüfung: reicht aus, um echte Adressen durchzulassen und
// jede Form von CR/LF oder Envelope-Sonderzeichen ("<", ">", Leerraum) sicher
// abzulehnen. Envelope-Adressen (MAIL FROM/RCPT TO) werden direkt in rohe
// SMTP-Befehlszeilen eingesetzt – ungeprüft wäre das eine klassische
// SMTP-/Header-Injection (CWE-93): ein Empfänger wie
// "a@b.de>\r\nRCPT TO:<opfer@x.de" könnte zusätzliche Befehle einschleusen.
const EMAIL_ADDRESS_RE = /^[^\s<>()[\]\\,;:"@\r\n]+@[^\s<>()[\]\\,;:"@\r\n]+\.[^\s<>()[\]\\,;:"@\r\n]{2,}$/

function assertSafeEmailAddress(address: string, field: string): string {
  const trimmed = address.trim()
  if (!EMAIL_ADDRESS_RE.test(trimmed)) {
    throw new SmtpError(`Ungültige E-Mail-Adresse (${field}): "${address}"`)
  }
  return trimmed
}

// Header-Werte (Subject, Absendername) landen roh als "Header: <wert>\r\n" in
// der DATA-Phase – ein eingeschleustes CR/LF im Wert würde zusätzliche
// Header oder sogar eine komplett neue, vom Angreifer kontrollierte Nachricht
// einschleusen (Header-Injection). encodeHeader() base64-kodiert zwar
// Nicht-ASCII, ließe ein reines "a\r\nBcc: opfer@x.de" in einem ASCII-Subject
// aber unverändert durch – deshalb hier zusätzlich hart entschärft.
function stripHeaderInjection(text: string): string {
  return text.replace(/[\r\n]+/g, ' ')
}

export async function sendSmtpMail(config: SmtpConfig, message: SmtpMessage): Promise<void> {
  const to = assertSafeEmailAddress(message.to, 'Empfänger')
  const fromEmail = assertSafeEmailAddress(message.fromEmail, 'Absender')
  const fromName = message.fromName ? stripHeaderInjection(message.fromName) : message.fromName
  const subject = stripHeaderInjection(message.subject)

  let conn: Deno.Conn =
    config.encryption === 'tls'
      ? await Deno.connectTls({ hostname: config.hostname, port: config.port })
      : await Deno.connect({ hostname: config.hostname, port: config.port })

  let io = openIo(conn)
  try {
    await expectCode(io, 220) // Server-Greeting

    await command(io, `EHLO kicktipp-spielrunde.local`, 250)

    if (config.encryption === 'starttls') {
      await command(io, 'STARTTLS', 220)
      // Reader/Writer-Locks lösen, bevor Deno.startTls die zugrunde liegende
      // Ressource übernimmt.
      io.reader.releaseLock()
      io.writer.releaseLock()
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: config.hostname })
      io = openIo(conn)
      await command(io, `EHLO kicktipp-spielrunde.local`, 250)
    }

    if (config.username) {
      await command(io, 'AUTH LOGIN', 334)
      await command(io, base64(config.username), 334)
      await command(io, base64(config.password ?? ''), 235)
    }

    await command(io, `MAIL FROM:<${fromEmail}>`, 250)
    await command(io, `RCPT TO:<${to}>`, 250)
    await command(io, 'DATA', 354)

    const from = fromName ? `${encodeHeader(fromName)} <${fromEmail}>` : fromEmail
    const headers = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ].join('\r\n')
    // Base64 enthält keine Zeilen, die mit "." beginnen können – SMTP-
    // Dot-Stuffing der DATA-Phase ist damit für den Body kein Thema.
    const body = wrapBase64(base64(message.html))
    await write(io, `${headers}\r\n\r\n${body}\r\n.\r\n`)
    await expectCode(io, 250)

    await command(io, 'QUIT', 221)
  } finally {
    try {
      conn.close()
    } catch {
      // Verbindung war eventuell schon vom Server geschlossen – irrelevant.
    }
  }
}

interface Io {
  reader: ReadableStreamDefaultReader<Uint8Array>
  writer: WritableStreamDefaultWriter<Uint8Array>
  buffer: { value: string }
}

function openIo(conn: Deno.Conn): Io {
  return { reader: conn.readable.getReader(), writer: conn.writable.getWriter(), buffer: { value: '' } }
}

async function write(io: Io, text: string): Promise<void> {
  await io.writer.write(new TextEncoder().encode(text))
}

async function command(io: Io, line: string, expectedCode: number): Promise<string> {
  await write(io, `${line}\r\n`)
  return expectCode(io, expectedCode)
}

async function expectCode(io: Io, expectedCode: number): Promise<string> {
  const response = await readResponse(io)
  const code = Number(response.slice(0, 3))
  if (code !== expectedCode) {
    throw new SmtpError(`SMTP-Server antwortete unerwartet: "${response.trim()}" (erwartet: ${expectedCode})`)
  }
  return response
}

async function readResponse(io: Io): Promise<string> {
  const decoder = new TextDecoder()
  while (true) {
    const lines = io.buffer.value.split('\r\n')
    // Die letzte "Zeile" ist entweder leer (Puffer endet exakt auf \r\n) oder
    // ein noch unvollständiges Fragment – beides bleibt im Puffer.
    const complete = lines.slice(0, -1)
    if (complete.length > 0 && /^\d{3} /.test(complete[complete.length - 1])) {
      const consumedLineCount = complete.length
      const full = complete.join('\r\n') + '\r\n'
      io.buffer.value = lines.slice(consumedLineCount).join('\r\n')
      return full
    }

    const { value, done } = await io.reader.read()
    if (done) throw new SmtpError('Verbindung wurde vom SMTP-Server unerwartet geschlossen.')
    io.buffer.value += decoder.decode(value, { stream: true })
  }
}

function base64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)))
}

function wrapBase64(b64: string): string {
  const lines: string[] = []
  for (let i = 0; i < b64.length; i += 76) lines.push(b64.slice(i, i + 76))
  return lines.join('\r\n')
}

function encodeHeader(text: string): string {
  const isAscii = [...text].every((char) => char.codePointAt(0)! < 128)
  return isAscii ? text : `=?UTF-8?B?${base64(text)}?=`
}

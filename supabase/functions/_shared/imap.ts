// Minimaler eigener IMAP-Client über rohe TCP-Sockets (Deno.connectTls), nach
// demselben Muster wie smtp.ts (siehe dortiger Kommentar zu Deno-Mail-
// Libraries, die in Supabase Edge Functions nach vorherigem fetch() abstürzen).
//
// Reiner SMTP-Versand legt beim Empfänger nichts im eigenen Postfach ab –
// anders als ein normaler Mail-Client (Outlook/Webmail) speichert er keine
// Kopie im "Gesendet"-Ordner. Dieser Client kann genau eine Sache: eine fertig
// aufgebaute Nachricht (siehe buildRawEmail in smtp.ts) per IMAP APPEND in
// einem admin-konfigurierten Ordner ablegen. Nur implizites TLS (Port 993,
// der de-facto Standard) – kein STARTTLS-Zweig, da bislang kein Bedarf.
//
// Der genaue IMAP-Ordnername (z. B. "Sent", "INBOX.Sent", "Gesendet" –
// abhängig vom Mail-Provider) wird bewusst nicht automatisch per
// LIST (SPECIAL-USE) erkannt, sondern in email_settings admin-konfiguriert –
// spart eine SPECIAL-USE-Implementierung für einen einzigen Mailbox-Fall.
// Schlägt APPEND fehl (typischerweise falscher Ordnername), listet
// listFolders() unten die tatsächlich vorhandenen Ordner für die Log-Meldung,
// damit der Admin den korrekten Namen nicht raten/selbst per IMAP-Client
// nachsehen muss.

export interface ImapConfig {
  hostname: string
  port: number
  username: string
  password: string
  sentFolder: string
}

export class ImapError extends Error {}

export async function appendToSentFolder(config: ImapConfig, rawMessage: string): Promise<void> {
  await withSentFolderAppender(config, (append) => append(rawMessage))
}

// Diagnose-Hilfe für den Fall, dass der konfigurierte Ordnername falsch ist
// (Server antwortet auf APPEND mit "Mailbox doesn't exist"): listet die
// tatsächlich vorhandenen Ordner, damit die Log-Meldung direkt den korrekten
// Namen nennt statt dass der Admin ihn blind erraten muss.
export async function listFolders(config: Omit<ImapConfig, 'sentFolder'>): Promise<string[]> {
  const conn = await Deno.connectTls({ hostname: config.hostname, port: config.port })
  const io = openIo(conn)
  let tagCounter = 0
  const nextTag = () => `A${++tagCounter}`

  try {
    await readGreeting(io)
    await command(io, nextTag(), `LOGIN ${quote(config.username)} ${quote(config.password)}`)
    const lines = await command(io, nextTag(), 'LIST "" "*"')
    await write(io, `${nextTag()} LOGOUT\r\n`).catch(() => {})
    return lines.map(parseListFolderName).filter((name): name is string => name !== null)
  } finally {
    try {
      conn.close()
    } catch {
      // Verbindung war eventuell schon vom Server geschlossen – irrelevant.
    }
  }
}

// Ordnername ist der letzte Token einer "* LIST (flags) "sep" name"-Zeile,
// entweder quoted (ggf. mit Escapes) oder ein nacktes Atom.
function parseListFolderName(line: string): string | null {
  const quoted = line.match(/"((?:[^"\\]|\\.)*)"\s*$/)
  if (quoted) return quoted[1].replace(/\\(.)/g, '$1')
  const parts = line.trim().split(/\s+/)
  return parts.length > 0 ? parts[parts.length - 1] : null
}

// Für den Massenversand eine einzige Verbindung für alle Empfänger
// wiederverwenden statt pro E-Mail neu zu verbinden/einzuloggen.
export async function withSentFolderAppender(
  config: ImapConfig,
  fn: (append: (rawMessage: string) => Promise<void>) => Promise<void>,
): Promise<void> {
  const conn = await Deno.connectTls({ hostname: config.hostname, port: config.port })
  const io = openIo(conn)
  let tagCounter = 0
  const nextTag = () => `A${++tagCounter}`

  try {
    await readGreeting(io)
    await command(io, nextTag(), `LOGIN ${quote(config.username)} ${quote(config.password)}`)

    await fn(async (rawMessage) => {
      const literal = new TextEncoder().encode(rawMessage)
      const tag = nextTag()
      await write(io, `${tag} APPEND ${quote(config.sentFolder)} (\\Seen) {${literal.length}}\r\n`)
      await expectContinuation(io)
      await write(io, `${rawMessage}\r\n`)
      await readUntilTagged(io, tag)
    })

    await write(io, `${nextTag()} LOGOUT\r\n`).catch(() => {})
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

async function readLine(io: Io): Promise<string> {
  const decoder = new TextDecoder()
  while (true) {
    const idx = io.buffer.value.indexOf('\r\n')
    if (idx !== -1) {
      const line = io.buffer.value.slice(0, idx)
      io.buffer.value = io.buffer.value.slice(idx + 2)
      return line
    }
    const { value, done } = await io.reader.read()
    if (done) throw new ImapError('Verbindung wurde vom IMAP-Server unerwartet geschlossen.')
    io.buffer.value += decoder.decode(value, { stream: true })
  }
}

async function readGreeting(io: Io): Promise<void> {
  const line = await readLine(io)
  if (!line.startsWith('* OK')) {
    throw new ImapError(`Unerwartete IMAP-Begrüßung: "${line}"`)
  }
}

async function expectContinuation(io: Io): Promise<void> {
  const line = await readLine(io)
  if (!line.startsWith('+')) {
    throw new ImapError(`IMAP-Server erwartete kein Literal: "${line}"`)
  }
}

// Liest Zeilen, bis eine mit "<tag> " beginnt (z. B. "A3 OK ..."); wirft bei
// NO/BAD den vollen Server-Text, für auswertbare Fehlermeldungen im Log.
// Gibt die zuvor gesammelten untagged Zeilen zurück (z. B. für LIST-Ergebnisse).
async function readUntilTagged(io: Io, tag: string): Promise<string[]> {
  const lines: string[] = []
  while (true) {
    const line = await readLine(io)
    if (line.startsWith(`${tag} `)) {
      if (!line.startsWith(`${tag} OK`)) {
        throw new ImapError(`IMAP-Server antwortete mit Fehler: "${line}"`)
      }
      return lines
    }
    lines.push(line)
  }
}

async function command(io: Io, tag: string, line: string): Promise<string[]> {
  await write(io, `${tag} ${line}\r\n`)
  return readUntilTagged(io, tag)
}

// IMAP-Quoted-String: Backslash und doppelte Anführungszeichen müssen
// escaped werden; ein CR/LF im Wert könnte sonst zusätzliche Befehle
// einschleusen (dieselbe Injection-Klasse wie bei SMTP, siehe smtp.ts).
function quote(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new ImapError('Ungültiger IMAP-Wert (enthält Zeilenumbruch).')
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

import { appendToSentFolder, withSentFolderAppender, listFolders, ImapError } from './imap.ts'
import { logAppError } from './logging.ts'

export interface ArchiveSettings {
  imap_host: string | null
  imap_port: number | null
  imap_sent_folder: string | null
  smtp_username: string | null
  smtp_password: string | null
}

// Ablage im Gesendet-Ordner ist reine Komfortfunktion (siehe imap.ts) – ein
// Fehler dort darf eine bereits erfolgreich verschickte E-Mail nicht als
// Fehlschlag melden, landet aber als Warnung im Log (inkl. der tatsächlich
// vorhandenen Ordner zur Diagnose). Gemeinsam für alle Mail-Versand-Functions
// (send-email, send-bulk-email, send-password-reset, send-contact-message,
// update-own-email) statt fünffach dupliziert.
export async function archiveToSentFolder(
  supabaseUrl: string,
  serviceRoleKey: string,
  source: string,
  settings: ArchiveSettings,
  rawMessage: string,
  extraDetails?: Record<string, unknown>,
): Promise<void> {
  if (!settings.imap_host || !settings.imap_port || !settings.imap_sent_folder) return
  await archiveManyToSentFolder(supabaseUrl, serviceRoleKey, source, settings, [rawMessage], extraDetails)
}

// Für den Massenversand eine einzige IMAP-Verbindung für alle Nachrichten
// wiederverwenden statt pro E-Mail neu zu verbinden/einzuloggen.
export async function archiveManyToSentFolder(
  supabaseUrl: string,
  serviceRoleKey: string,
  source: string,
  settings: ArchiveSettings,
  rawMessages: string[],
  extraDetails?: Record<string, unknown>,
): Promise<void> {
  if (rawMessages.length === 0 || !settings.imap_host || !settings.imap_port || !settings.imap_sent_folder) return

  const imapConfig = {
    hostname: settings.imap_host,
    port: settings.imap_port,
    username: settings.smtp_username ?? '',
    password: settings.smtp_password ?? '',
  }
  try {
    if (rawMessages.length === 1) {
      await appendToSentFolder({ ...imapConfig, sentFolder: settings.imap_sent_folder }, rawMessages[0])
    } else {
      await withSentFolderAppender({ ...imapConfig, sentFolder: settings.imap_sent_folder }, async (append) => {
        for (const raw of rawMessages) await append(raw)
      })
    }
  } catch (err) {
    const message = err instanceof ImapError ? err.message : err instanceof Error ? err.message : String(err)
    const availableFolders = await listFolders(imapConfig).catch(() => null)
    await logAppError(
      supabaseUrl,
      serviceRoleKey,
      source,
      `Kopie im Gesendet-Ordner konnte nicht abgelegt werden: ${message}`,
      {
        ...extraDetails,
        imap_host: settings.imap_host,
        imap_sent_folder: settings.imap_sent_folder,
        available_folders: availableFolders,
      },
      'warn',
    )
  }
}

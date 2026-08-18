import type { PermissionKey, UserRole } from '../../types/database'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Mehr Versuche mit wachsendem Abstand statt nur 1 Retry: ein direkt nach
// Re-Login/Token-Refresh auftretender Fehlschlag (kalte Verbindung nach
// Standby, Netzwerk-Reconnect-Chaos) ist meist innerhalb weniger Sekunden
// vorbei. Von loadProfileDataIfNeeded() UND refreshProfile()/
// refreshPermissions() in AuthProvider.tsx genutzt, damit alle denselben
// Schutz haben statt leicht unterschiedlicher Kopien.
const PERMISSION_FETCH_RETRY_DELAYS_MS = [2_000, 5_000, 10_000]

// Eigene Datei statt Teil von AuthProvider.tsx: so bleibt die Retry-Logik
// isoliert testbar mit einem Fetcher-Stub, ohne den Supabase-Client zu
// importieren/mocken.
export async function fetchPermissionsWithRetry(
  role: UserRole,
  fetcher: (role: UserRole) => Promise<Set<PermissionKey>>,
): Promise<Set<PermissionKey>> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetcher(role)
    } catch (err) {
      if (attempt >= PERMISSION_FETCH_RETRY_DELAYS_MS.length) throw err
      console.error(
        `Berechtigungen konnten nicht geladen werden, versuche erneut (${attempt + 2}/${PERMISSION_FETCH_RETRY_DELAYS_MS.length + 1})`,
        err,
      )
      await delay(PERMISSION_FETCH_RETRY_DELAYS_MS[attempt])
    }
  }
}

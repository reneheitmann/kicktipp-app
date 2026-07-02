import type { Player, Profile } from '../../types/database'

export interface TipperRow {
  kicktippName: string
  email: string | null
  hasValidEmail: boolean
  playerExists: boolean
  existingPlayerId: string | null
  existingPlayerHasLogin: boolean
  loginAlreadyExistsForEmail: boolean
}

/**
 * Ordnet rohe Tipperlisten-Zeilen (Kicktipp-Datenexport "Tipperliste") gegen
 * bereits vorhandene Spieler/Logins zu, damit beim Import nichts doppelt
 * angelegt wird.
 */
export function classifyTipperRows(
  rawRows: { name: string; email: string }[],
  existingPlayers: Player[],
  existingProfiles: Profile[],
  linkedPlayerIds: Set<string>,
): TipperRow[] {
  return rawRows
    .filter((r) => r.name.trim() !== '')
    .map((raw) => {
      const kicktippName = raw.name.trim()
      const normalizedName = kicktippName.toLowerCase()
      const existingPlayer = existingPlayers.find((p) => p.kicktipp_name?.trim().toLowerCase() === normalizedName)

      const rawEmail = raw.email.trim()
      const hasValidEmail = rawEmail !== '' && rawEmail !== '-' && rawEmail.includes('@')
      const normalizedEmail = rawEmail.toLowerCase()
      const loginAlreadyExistsForEmail = hasValidEmail
        ? existingProfiles.some((p) => p.email?.toLowerCase() === normalizedEmail)
        : false

      return {
        kicktippName,
        email: hasValidEmail ? rawEmail : null,
        hasValidEmail,
        playerExists: !!existingPlayer,
        existingPlayerId: existingPlayer?.id ?? null,
        existingPlayerHasLogin: existingPlayer ? linkedPlayerIds.has(existingPlayer.id) : false,
        loginAlreadyExistsForEmail,
      }
    })
}

export function willCreateLogin(row: TipperRow, createLoginsEnabled: boolean): boolean {
  return createLoginsEnabled && row.hasValidEmail && !row.loginAlreadyExistsForEmail && !row.existingPlayerHasLogin
}

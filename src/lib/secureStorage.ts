import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import type { SupportedStorage } from '@supabase/supabase-js'

/**
 * mobile only: Supabase-`storage`-Adapter auf Basis von Keychain (iOS) /
 * Keystore-abgesicherten EncryptedSharedPreferences (Android) statt
 * `@capacitor/preferences` (nur einfaches UserDefaults/SharedPreferences,
 * unverschlüsselt) – siehe docs/mobile-app.md, Sicherheitsarchitektur.
 * `@aparajita/capacitor-secure-storage` gewählt: aktiv gepflegt (Stand
 * dieser Änderung), Versionsschema explizit an Capacitor 8+ ausgerichtet.
 *
 * `getItem`/`setItem`/`removeItem` entsprechen bereits exakt der von
 * supabase-js erwarteten `SupportedStorage`-Form (Pick<Storage, ...>,
 * promisifiziert) – keine zusätzliche Übersetzungsschicht nötig, nur ein
 * benannter Re-Export für Lesbarkeit und leichteres Mocken in Tests.
 */
export const secureStorage: SupportedStorage = {
  getItem: (key) => SecureStorage.getItem(key),
  setItem: (key, value) => SecureStorage.setItem(key, value),
  removeItem: (key) => SecureStorage.removeItem(key),
}

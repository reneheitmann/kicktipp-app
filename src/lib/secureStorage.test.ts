import { describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

// Mockt das native Plugin, statt eine echte Keychain/Keystore-Umgebung zu
// brauchen – secureStorage.ts ist nur eine dünne, benannte Weiterleitung
// (siehe dortiger Kommentar), der Test prüft genau das: die drei Methoden
// reichen Aufrufe unverändert an das Plugin durch.
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
  },
}))

const { secureStorage } = await import('./secureStorage')

describe('secureStorage', () => {
  it('gibt null für einen nicht existierenden Schlüssel zurück', async () => {
    expect(await secureStorage.getItem('nicht-vorhanden')).toBeNull()
  })

  it('speichert und liest einen Wert', async () => {
    await secureStorage.setItem('kicktipp_mobile_active_instance_id', 'abc-123')
    expect(await secureStorage.getItem('kicktipp_mobile_active_instance_id')).toBe('abc-123')
  })

  it('entfernt einen Wert', async () => {
    await secureStorage.setItem('temp-key', 'wert')
    await secureStorage.removeItem('temp-key')
    expect(await secureStorage.getItem('temp-key')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { validateInstanceInfo } from './instanceInfoSchema'

const VALID = {
  supabase_url: 'https://xxxxx.supabase.co',
  supabase_anon_key: 'sb_publishable_abc123',
  default_name: 'Kicktipp Spielrunde',
}

describe('validateInstanceInfo', () => {
  it('akzeptiert eine vollständige, gültige Antwort', () => {
    const result = validateInstanceInfo(VALID)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.info).toEqual(VALID)
  })

  it('lehnt eine Nicht-Objekt-Antwort ab', () => {
    expect(validateInstanceInfo('kein objekt').ok).toBe(false)
    expect(validateInstanceInfo(null).ok).toBe(false)
    expect(validateInstanceInfo(undefined).ok).toBe(false)
  })

  it('lehnt fehlendes supabase_url ab', () => {
    const { supabase_url: _, ...rest } = VALID
    expect(validateInstanceInfo(rest).ok).toBe(false)
  })

  it('lehnt supabase_url ohne https ab', () => {
    expect(validateInstanceInfo({ ...VALID, supabase_url: 'http://xxxxx.supabase.co' }).ok).toBe(false)
  })

  it('lehnt supabase_url mit privater/lokaler Adresse ab (SSRF-Härtung, siehe instanceUrl.ts)', () => {
    expect(validateInstanceInfo({ ...VALID, supabase_url: 'https://127.0.0.1' }).ok).toBe(false)
  })

  it('lehnt fehlendes supabase_anon_key ab', () => {
    const { supabase_anon_key: _, ...rest } = VALID
    expect(validateInstanceInfo(rest).ok).toBe(false)
  })

  it('lehnt leeres default_name ab', () => {
    expect(validateInstanceInfo({ ...VALID, default_name: '  ' }).ok).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { isValidInstanceUrl, normalizeInstanceUrl } from './instanceUrl'

describe('isValidInstanceUrl', () => {
  it('akzeptiert eine echte Instanz-Domain', () => {
    expect(isValidInstanceUrl('https://gewinnauswertung.magicprus.de')).toBe(true)
  })

  it('akzeptiert eine Supabase-Projekt-URL', () => {
    expect(isValidInstanceUrl('https://xxxxx.supabase.co')).toBe(true)
  })

  it('lehnt http:// ab', () => {
    expect(isValidInstanceUrl('http://gewinnauswertung.magicprus.de')).toBe(false)
  })

  it('lehnt eingebettetes Userinfo ab', () => {
    expect(isValidInstanceUrl('https://user:pass@evil.com')).toBe(false)
  })

  it('lehnt hex-kodierte private IPs ab (new URL() normalisiert auf 127.0.0.1)', () => {
    expect(isValidInstanceUrl('https://0x7f.0.0.1')).toBe(false)
  })

  it.each([
    'https://127.0.0.1',
    'https://127.0.0.1:8080',
    'https://10.0.0.5',
    'https://172.16.0.1',
    'https://192.168.1.1',
    'https://169.254.1.1',
    'https://localhost',
    'https://[::1]',
    'https://[fe80::1]',
  ])('lehnt private/lokale Adresse %s ab', (input) => {
    expect(isValidInstanceUrl(input)).toBe(false)
  })

  it('akzeptiert eine öffentliche IP außerhalb privater Bereiche', () => {
    expect(isValidInstanceUrl('https://172.32.0.1')).toBe(true)
  })

  it('lehnt ungültige Eingaben ab', () => {
    expect(isValidInstanceUrl('not a url')).toBe(false)
  })

  it('lehnt andere Protokolle ab', () => {
    expect(isValidInstanceUrl('ftp://example.com')).toBe(false)
  })
})

describe('normalizeInstanceUrl', () => {
  it('entfernt Pfad/Query/Hash/trailing slash', () => {
    expect(normalizeInstanceUrl('https://example.com/some/path?x=1#y')).toBe('https://example.com')
  })

  it('behält einen expliziten Port', () => {
    expect(normalizeInstanceUrl('https://example.com:8443/')).toBe('https://example.com:8443')
  })
})

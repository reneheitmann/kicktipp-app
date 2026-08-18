import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPermissionsWithRetry } from './permissionsRetry'

describe('fetchPermissionsWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('gibt das Ergebnis ohne Retry zurück, wenn der erste Versuch klappt', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Set(['page.dashboard.view']))
    const result = await fetchPermissionsWithRetry('admin', fetcher)
    expect(result).toEqual(new Set(['page.dashboard.view']))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('versucht es nach Fehlschlägen mit Backoff erneut und liefert dann das Ergebnis', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('netzwerkfehler'))
      .mockRejectedValueOnce(new Error('netzwerkfehler'))
      .mockResolvedValueOnce(new Set(['page.dashboard.view']))

    const resultPromise = fetchPermissionsWithRetry('admin', fetcher)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result).toEqual(new Set(['page.dashboard.view']))
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('wirft den letzten Fehler, wenn alle Versuche fehlschlagen', async () => {
    const finalError = new Error('endgültig fehlgeschlagen')
    const fetcher = vi.fn().mockRejectedValue(finalError)

    const resultPromise = fetchPermissionsWithRetry('admin', fetcher)
    resultPromise.catch(() => {})
    await vi.runAllTimersAsync()

    await expect(resultPromise).rejects.toThrow('endgültig fehlgeschlagen')
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})

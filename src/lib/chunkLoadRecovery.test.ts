import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tryRecoverFromChunkLoadError } from './chunkLoadRecovery'

function createSessionStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  }
}

describe('tryRecoverFromChunkLoadError', () => {
  let reload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    reload = vi.fn()
    vi.stubGlobal('sessionStorage', createSessionStorageStub())
    vi.stubGlobal('window', { location: { reload } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reloads once for a recognized chunk-load error message', () => {
    const recovered = tryRecoverFromChunkLoadError('Failed to fetch dynamically imported module: /x.js')
    expect(recovered).toBe(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload a second time within the same session', () => {
    tryRecoverFromChunkLoadError('Failed to fetch dynamically imported module: /x.js')
    const recovered = tryRecoverFromChunkLoadError('Failed to fetch dynamically imported module: /y.js')
    expect(recovered).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('ignores unrelated error messages', () => {
    const recovered = tryRecoverFromChunkLoadError('TypeError: something else broke')
    expect(recovered).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Integration tests validating M29 swrFetcher unification.
 * Ensures swrFetcher is the single source of truth exported from @/lib/api.
 */

const mockFetch = vi.fn()
global.fetch = mockFetch

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

describe('swrFetcher unified (M29 regression)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('swrFetcher is exported from @/lib/api', async () => {
    const api = await import('@/lib/api')
    expect(typeof api.swrFetcher).toBe('function')
  })

  it('swrFetcher calls fetch with the given URL', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))
    const { swrFetcher } = await import('@/lib/api')
    await swrFetcher('/api/health')
    expect(mockFetch).toHaveBeenCalledWith('/api/health')
  })

  it('swrFetcher returns parsed JSON body', async () => {
    const payload = { status: 'ok', version: '1.0' }
    mockFetch.mockResolvedValueOnce(mockResponse(payload))
    const { swrFetcher } = await import('@/lib/api')
    const result = await swrFetcher('/api/health')
    expect(result).toEqual(payload)
  })

  it('swrFetcher throws on non-ok HTTP status', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse('error', 500))
    const { swrFetcher } = await import('@/lib/api')
    await expect(swrFetcher('/api/health')).rejects.toThrow('HTTP 500')
  })

  it('swrFetcher is callable multiple times without side-effects', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ call: 1 }))
      .mockResolvedValueOnce(mockResponse({ call: 2 }))
    const { swrFetcher } = await import('@/lib/api')
    const r1 = await swrFetcher('/api/health')
    const r2 = await swrFetcher('/api/health')
    expect(r1).toEqual({ call: 1 })
    expect(r2).toEqual({ call: 2 })
  })

  it('swrFetcher and request share the same module — no duplicate fetcher symbol', async () => {
    const api = await import('@/lib/api')
    // If there were a stale "const fetcher = ..." export it would appear here.
    // We verify that the only exported fetcher is swrFetcher.
    const exportedKeys = Object.keys(api)
    const fetcherLikeKeys = exportedKeys.filter(
      (k) => k.toLowerCase().includes('fetch') || k.toLowerCase().includes('fetcher')
    )
    // swrFetcher must be present; no raw "fetcher" export should exist
    expect(fetcherLikeKeys).toContain('swrFetcher')
    expect(fetcherLikeKeys).not.toContain('fetcher')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock fetch before importing module ──────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper: create a mock Response
function mockResponse(body: unknown, status = 200): Response {
  const json = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(json),
  } as unknown as Response;
}

// ── request<T> ───────────────────────────────────────────────────────────────
describe('request<T>', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Silence errorLogger side-effects
    vi.mock('@/lib/error-logger', () => ({
      errorLogger: { capture: vi.fn() },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves with parsed JSON on 200', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ status: 'ok' }, 200));
    const { healthAPI } = await import('@/lib/api');
    const result = await healthAPI.get();
    expect(result).toHaveProperty('status');
  });

  it('throws on 404 response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse('Not Found', 404));
    const { healthAPI } = await import('@/lib/api');
    await expect(healthAPI.get()).rejects.toThrow(/API 404/);
  });

  it('throws on 500 response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse('Internal Server Error', 500));
    const { healthAPI } = await import('@/lib/api');
    await expect(healthAPI.get()).rejects.toThrow(/API 500/);
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { healthAPI } = await import('@/lib/api');
    await expect(healthAPI.get()).rejects.toThrow('Failed to fetch');
  });

  it('sends Content-Type: application/json header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ status: 'ok' }, 200));
    const { healthAPI } = await import('@/lib/api');
    await healthAPI.get();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1]?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });
});

// ── swrFetcher ────────────────────────────────────────────────────────────────
describe('swrFetcher', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('resolves with JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: 42 }, 200));
    const { swrFetcher } = await import('@/lib/api');
    const result = await swrFetcher('/api/health');
    expect(result).toEqual({ data: 42 });
  });

  it('throws Error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse('bad', 503));
    const { swrFetcher } = await import('@/lib/api');
    await expect(swrFetcher('/api/health')).rejects.toThrow(/HTTP 503/);
  });

  it('passes the URL to fetch unchanged', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({}, 200));
    const { swrFetcher } = await import('@/lib/api');
    await swrFetcher('/api/custom-path');
    expect(mockFetch).toHaveBeenCalledWith('/api/custom-path');
  });
});

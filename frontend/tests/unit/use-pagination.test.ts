import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '@/lib/use-pagination';

describe('usePagination', () => {
  const items = Array.from({ length: 55 }, (_, i) => ({ id: i }));

  // ── initial state ────────────────────────────────────────────────────────────
  it('starts at page 1', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    expect(result.current.page).toBe(1);
  });

  it('calculates correct totalPages', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    // 55 items / 20 per page = ceil(2.75) = 3
    expect(result.current.totalPages).toBe(3);
  });

  it('calculates totalItems', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    expect(result.current.totalItems).toBe(55);
  });

  it('returns first 20 items on page 1', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    expect(result.current.pageData).toHaveLength(20);
    expect(result.current.pageData[0]).toEqual({ id: 0 });
    expect(result.current.pageData[19]).toEqual({ id: 19 });
  });

  // ── nextPage / prevPage ──────────────────────────────────────────────────────
  it('nextPage advances to page 2', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
  });

  it('page 2 contains items 20-39', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.nextPage());
    expect(result.current.pageData[0]).toEqual({ id: 20 });
    expect(result.current.pageData[19]).toEqual({ id: 39 });
  });

  it('last page contains remaining items (15)', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.setPage(3));
    expect(result.current.pageData).toHaveLength(15);
    expect(result.current.pageData[0]).toEqual({ id: 40 });
  });

  it('prevPage on page 1 stays at page 1 (floor clamp)', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });

  it('nextPage on last page clamps to last page', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.setPage(3));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(3);
  });

  // ── setPage ──────────────────────────────────────────────────────────────────
  it('setPage clamps below 1 to 1', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.setPage(-5));
    expect(result.current.page).toBe(1);
  });

  it('setPage clamps above totalPages to totalPages', () => {
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.setPage(999));
    expect(result.current.page).toBe(3);
  });

  // ── edge cases ───────────────────────────────────────────────────────────────
  it('empty array has totalPages 1 and empty pageData', () => {
    const { result } = renderHook(() => usePagination([], 20));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageData).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('single item array has totalPages 1', () => {
    const { result } = renderHook(() => usePagination([{ id: 0 }], 20));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageData).toHaveLength(1);
  });

  it('exactly pageSize items has totalPages 1', () => {
    const exact = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => usePagination(exact, 20));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageData).toHaveLength(20);
  });

  it('pageSize=1 gives each item on its own page', () => {
    const small = [{ id: 0 }, { id: 1 }, { id: 2 }];
    const { result } = renderHook(() => usePagination(small, 1));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pageData).toHaveLength(1);
    expect(result.current.pageData[0]).toEqual({ id: 0 });
  });
});

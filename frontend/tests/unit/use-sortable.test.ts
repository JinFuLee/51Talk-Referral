import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSortable } from '@/lib/use-sortable';

type Row = { name: string; score: number | null; value: unknown };

const data: Row[] = [
  { name: 'Charlie', score: 70, value: 'c' },
  { name: 'Alice', score: 90, value: 'a' },
  { name: 'Bob', score: 80, value: 'b' },
];

const dataWithNulls: Row[] = [
  { name: 'Alice', score: null, value: null },
  { name: 'Bob', score: 50, value: 'b' },
  { name: 'Charlie', score: 30, value: 'a' },
];

describe('useSortable', () => {
  // ── initial state ────────────────────────────────────────────────────────────
  it('uses defaultKey and defaultDir', () => {
    const { result } = renderHook(() => useSortable(data, 'score', 'desc'));
    expect(result.current.sortKey).toBe('score');
    expect(result.current.sortDir).toBe('desc');
  });

  it('sorts descending by default (highest first)', () => {
    const { result } = renderHook(() => useSortable(data, 'score', 'desc'));
    const scores = result.current.sortedData.map((r) => r.score);
    expect(scores).toEqual([90, 80, 70]);
  });

  it('sorts ascending when defaultDir is asc', () => {
    const { result } = renderHook(() => useSortable(data, 'score', 'asc'));
    const scores = result.current.sortedData.map((r) => r.score);
    expect(scores).toEqual([70, 80, 90]);
  });

  // ── onSort toggle ────────────────────────────────────────────────────────────
  it('onSort on same key toggles direction asc→desc', () => {
    const { result } = renderHook(() => useSortable(data, 'score', 'asc'));
    act(() => result.current.onSort('score'));
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.sortKey).toBe('score');
  });

  it('onSort on same key toggles direction desc→asc', () => {
    const { result } = renderHook(() => useSortable(data, 'score', 'desc'));
    act(() => result.current.onSort('score'));
    expect(result.current.sortDir).toBe('asc');
  });

  it('onSort on new key resets to desc', () => {
    const { result } = renderHook(() => useSortable(data, 'score', 'asc'));
    act(() => result.current.onSort('name'));
    expect(result.current.sortKey).toBe('name');
    expect(result.current.sortDir).toBe('desc');
  });

  // ── string sort ──────────────────────────────────────────────────────────────
  it('sorts strings alphabetically descending (Z→A)', () => {
    const { result } = renderHook(() => useSortable(data, 'name', 'desc'));
    const names = result.current.sortedData.map((r) => r.name);
    expect(names).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('sorts strings alphabetically ascending (A→Z)', () => {
    const { result } = renderHook(() => useSortable(data, 'name', 'asc'));
    const names = result.current.sortedData.map((r) => r.name);
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  // ── null / undefined always last ─────────────────────────────────────────────
  it('null values sort to the end regardless of direction (asc)', () => {
    const { result } = renderHook(() => useSortable(dataWithNulls, 'score', 'asc'));
    const scores = result.current.sortedData.map((r) => r.score);
    expect(scores[scores.length - 1]).toBeNull();
  });

  it('null values sort to the end regardless of direction (desc)', () => {
    const { result } = renderHook(() => useSortable(dataWithNulls, 'score', 'desc'));
    const scores = result.current.sortedData.map((r) => r.score);
    expect(scores[scores.length - 1]).toBeNull();
  });

  it('two nulls remain stable relative order (both last)', () => {
    const twoNulls: Row[] = [
      { name: 'A', score: null, value: null },
      { name: 'B', score: 10, value: 'x' },
      { name: 'C', score: null, value: null },
    ];
    const { result } = renderHook(() => useSortable(twoNulls, 'score', 'asc'));
    const lastTwo = result.current.sortedData.slice(-2);
    expect(lastTwo.every((r) => r.score === null)).toBe(true);
  });

  // ── does not mutate original data ─────────────────────────────────────────────
  it('does not mutate the input array', () => {
    const original = [...data];
    renderHook(() => useSortable(data, 'score', 'asc'));
    expect(data).toEqual(original);
  });

  // ── edge cases ────────────────────────────────────────────────────────────────
  it('empty array returns empty sortedData', () => {
    const { result } = renderHook(() => useSortable([] as Row[], 'score', 'desc'));
    expect(result.current.sortedData).toHaveLength(0);
  });

  it('single item array returns that item', () => {
    const single: Row[] = [{ name: 'Solo', score: 42, value: 'x' }];
    const { result } = renderHook(() => useSortable(single, 'score', 'desc'));
    expect(result.current.sortedData).toHaveLength(1);
    expect(result.current.sortedData[0].name).toBe('Solo');
  });
});

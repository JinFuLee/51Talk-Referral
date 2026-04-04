'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import type { PageDimensions } from '@/lib/types/filters';

const usePageDimensionsStore = create<{
  dims: PageDimensions;
  setDims: (d: PageDimensions) => void;
}>((set) => ({
  dims: {},
  setDims: (dims) => set({ dims }),
}));

/**
 * 在页面顶层调用，声明本页面支持的维度。
 * UnifiedFilterBar 读取此声明自动隐藏不适用的筛选器。
 *
 * Example:
 * usePageDimensions({ country: true, dataRole: true, enclosure: true, team: true });
 */
export function usePageDimensions(dims: PageDimensions): void {
  const setDims = usePageDimensionsStore((s) => s.setDims);
  useEffect(() => {
    setDims(dims);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * 读取当前页面声明的维度（供 UnifiedFilterBar 消费）。
 */
export function useCurrentPageDimensions(): PageDimensions {
  return usePageDimensionsStore((s) => s.dims);
}

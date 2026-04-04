import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Zustand persist 需要 localStorage；每例重置防跨测试污染
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
beforeEach(() => localStorageMock.clear());

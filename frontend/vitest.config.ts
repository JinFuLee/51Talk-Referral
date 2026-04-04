import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)', 'tests/**/test_*.?(c|m)[jt]s?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['lib/**', 'stores/**', 'components/shared/**'],
      exclude: ['node_modules/', 'tests/'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 25,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

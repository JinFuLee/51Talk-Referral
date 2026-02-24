import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)', 'tests/**/test_*.?(c|m)[jt]s?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})

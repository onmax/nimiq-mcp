import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts'],
    coverage: {
      include: ['packages/**/src/**/*.ts'],
      exclude: ['packages/**/*.test.ts', 'packages/**/*.d.ts', 'packages/**/dist/**'],
      reporter: ['text', 'lcov', 'html'],
    },
  },
})

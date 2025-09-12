import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// Read version from package.json at build time
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/index.ts'],
      reporter: ['text', 'lcov', 'html'],
    },
  },
})

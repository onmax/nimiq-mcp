import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// Read version from package.json at build time
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    lib: {
      entry: ['src/index.ts', 'src/worker.ts'],
      formats: ['es'],
    },
    target: 'node20',
    outDir: 'dist',
    rollupOptions: {
      external: [
        '@modelcontextprotocol/sdk',
        '@nimiq/utils',
        'minisearch',
        'nimiq-rpc-client-ts',
        'valibot',
        'cloudflare:node',
        /^node:/,
      ],
      output: {
        preserveModules: true,
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    globals: true,
  },
})

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        worker: 'src/worker.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'node:process',
        'node:path',
        '@modelcontextprotocol/sdk/server/index.js',
        '@modelcontextprotocol/sdk/server/stdio.js',
        '@modelcontextprotocol/sdk/types.js',
        '@nimiq-mcp/core',
      ],
    },
    target: 'node20',
    outDir: 'dist',
  },
})

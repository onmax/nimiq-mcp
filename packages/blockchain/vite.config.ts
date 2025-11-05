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
        '@modelcontextprotocol/sdk/server/index.js',
        '@modelcontextprotocol/sdk/server/stdio.js',
        '@modelcontextprotocol/sdk/types.js',
        'nimiq-mcp-core',
        '@nimiq/utils/fiat-api',
        '@nimiq/utils/supply',
        'nimiq-rpc-client-ts/http',
      ],
    },
    target: 'node20',
    outDir: 'dist',
  },
})

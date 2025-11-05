import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/worker.ts',
      formats: ['es'],
      fileName: () => 'src/worker.js',
    },
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      external: [
        'nimiq-mcp-core',
        'nimiq-mcp-blockchain/worker',
        'nimiq-mcp-web-client/worker',
      ],
    },
  },
  test: {
    globals: true,
  },
})

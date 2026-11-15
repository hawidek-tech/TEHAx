import { defineConfig } from 'vite'

/**
 * Builds the partner loader as dist/db-signup.js (copied to dist/accessflow.js for older integrations).
 * A tiny standalone script: no framework, no global variables (the entry has no exports).
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2019',
    rollupOptions: {
      input: 'src/embed-loader/accessflow.ts',
      output: { format: 'iife', entryFileNames: 'db-signup.js' },
    },
  },
})

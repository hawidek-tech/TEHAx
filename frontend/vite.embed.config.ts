import { defineConfig } from 'vite'

/** Builds the partner loader (dist/accessflow.js): a tiny standalone script with no framework. */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/embed-loader/accessflow.ts',
      name: 'AccessFlow',
      formats: ['iife'],
      fileName: () => 'accessflow.js',
    },
    target: 'es2019',
  },
})

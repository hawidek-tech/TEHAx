/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server proxies API calls to the Spring Boot backend so the browser
// sees a single origin (no CORS needed in development).
// BACKEND_URL is read at dev-server start; it is not exposed to browser code.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: backendUrl, changeOrigin: false },
      '/actuator/health': { target: backendUrl, changeOrigin: false },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false, // Don't publish source maps in production builds.
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})

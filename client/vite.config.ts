import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  // Electron (main.js) loads http://localhost:5173 in dev. Pin the port and FAIL LOUD if it's
  // taken — otherwise Vite silently falls back to 5174 and Electron loads a stale app on 5173,
  // which looks like "db mismatch" errors (old frontend vs new backend).
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
})

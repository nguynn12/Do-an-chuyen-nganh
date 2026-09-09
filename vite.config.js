import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'Frontend'),
    },
  },
  build: {
    rollupOptions: {
      input: resolve(import.meta.dirname, 'index.html'),
    },
  },
})

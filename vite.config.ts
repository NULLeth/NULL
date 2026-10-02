import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // React 19 + Framer Motion in one chunk is ~160 kB gzipped; fine for a single-page app.
    chunkSizeWarningLimit: 640,
  },
})

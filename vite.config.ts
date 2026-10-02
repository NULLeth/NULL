import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Same-origin route the zkAPI SDK uses for the trusted deployment (Vercel rewrites it in production).
const zkapiProxy = {
  '/zkapi-deployment': {
    target: 'https://zkapi-mainnet.openanonymity.ai',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/zkapi-deployment/, ''),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: zkapiProxy },
  preview: { proxy: zkapiProxy },
  build: {
    // React 19 + Framer Motion in one chunk is ~160 kB gzipped; the zkAPI SDK is split out and only loads in live mode.
    chunkSizeWarningLimit: 640,
  },
})

import { defineConfig, type Plugin } from 'vite'
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

/** Serves api/connection.ts in dev, the way Vercel does in production. */
function devApi(): Plugin {
  return {
    name: 'null-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/connection', async (req, res) => {
        const mod = (await server.ssrLoadModule('/api/connection.ts')) as { GET: (r: Request) => Promise<Response> }
        const out = await mod.GET(new Request('http://localhost/api/connection', { headers: { 'x-real-ip': (req as unknown as { socket?: { remoteAddress?: string } }).socket?.remoteAddress ?? '' } }))
        res.setHeader('content-type', 'application/json')
        res.end(await out.text())
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  server: { proxy: zkapiProxy },
  preview: { proxy: zkapiProxy },
  build: {
    // React 19 + Framer Motion in one chunk is ~160 kB gzipped; the zkAPI SDK is split out and only loads in live mode.
    chunkSizeWarningLimit: 640,
  },
})

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// The launch-film workshop (film/). Not part of the public site.
//   dev:   npx vite --config vite.film.config.ts --port 5610
//   build: npx vite build --config vite.film.config.ts  →  brand/film/NULL-Film.html
// The built file is self-contained: open it in Chrome or Edge on any PC and render the MP4 there.

const here = path.dirname(fileURLToPath(import.meta.url))

/** Dev only: lets the workshop POST a frame (brand/film/shots/) or a rendered MP4 (brand/film/) to disk. */
function shotReceiver(): Plugin {
  return {
    name: 'null-film-shots',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        const url = new URL(req.url ?? '', 'http://x')
        const name = (url.searchParams.get('name') ?? 'frame').replace(/[^a-z0-9._-]/gi, '_')
        const ext = url.searchParams.get('ext') === 'mp4' ? 'mp4' : 'png'
        const dir = path.resolve(here, ext === 'mp4' ? 'brand/film' : 'brand/film/shots')
        fs.mkdirSync(dir, { recursive: true })
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          fs.writeFileSync(path.join(dir, `${name}.${ext}`), Buffer.concat(chunks))
          res.end('ok')
        })
      })
    },
  }
}

export default defineConfig({
  root: path.resolve(here, 'film'),
  base: './',
  plugins: [viteSingleFile(), shotReceiver()],
  build: { outDir: path.resolve(here, 'brand/film'), emptyOutDir: false, target: 'es2022', assetsInlineLimit: 100_000_000 },
})

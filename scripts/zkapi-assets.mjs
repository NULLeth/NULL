// Emits the zkAPI browser SDK's pinned public artifacts (proving keys, WASM,
// worker, browser-config) into public/zkapi/ so Vite serves and ships them.
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import { build } from 'esbuild'
import { buildBrowserSdkAssets } from '@openanonymity/zkapi-browser-sdk/build'

const network = process.env.ZKAPI_NETWORK ?? 'mainnet'

/**
 * Host profile overrides, matched to what Open Anonymity's own production app
 * pins (https://chat.openanonymity.ai/zkapi/browser-config.json). The public SDK
 * release (045b444, 2026-10-01) still ships the previous verifier, which the live
 * mainnet manifest rejects. Drop this once the SDK release catches up.
 */
const OVERRIDES = {
  mainnet: { verifier_url: 'https://verifier-production-20260917.openanonymity.ai' },
}

const outDir = 'public/zkapi'
const result = await buildBrowserSdkAssets({ outDir, publicPath: '/zkapi/', network, build })

const override = OVERRIDES[network]
if (override) {
  const configPath = `${outDir}/browser-config.json`
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  Object.assign(config.trusted_deployment, override)
  const text = `${JSON.stringify(config, null, 2)}\n`
  await fs.writeFile(configPath, text)
  const manifestPath = `${outDir}/sdk-assets.json`
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  manifest.files['browser-config.json'] = createHash('sha256').update(text).digest('hex')
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

console.log(`zkAPI ${network} assets → ${outDir} (${Object.keys(result.files).length} files verified${override ? ', host overrides applied' : ''})`)

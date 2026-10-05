// Builds the single-file NULL Agent Kit: agent-kit/null-agent.src.mjs with NULL Chat's Prompt
// Shield (src/chat/shield.ts, compiled to plain JS) dropped in, written to
// public/agent/null-agent.mjs so the site serves it at nullzk.com/agent/null-agent.mjs.
// Also writes its SHA-256 next to it for the /agents page.

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(ROOT, 'agent-kit/null-agent.src.mjs'), 'utf8')
const shieldTs = readFileSync(join(ROOT, 'src/chat/shield.ts'), 'utf8')

const shieldJs = transformSync(shieldTs, { loader: 'ts', format: 'esm', target: 'es2022', legalComments: 'none' })
  .code.replace(/^export \{[^}]*\};?\s*$/m, '')
  .replace(/^export (?=(const|function|let|class) )/gm, '')
  .trim()

if (!src.includes('/*__SHIELD__*/')) throw new Error('shield marker missing in agent-kit/null-agent.src.mjs')
const out = src.replace('/*__SHIELD__*/', shieldJs)
mkdirSync(join(ROOT, 'public/agent'), { recursive: true })
writeFileSync(join(ROOT, 'public/agent/null-agent.mjs'), out)
const sha = createHash('sha256').update(out).digest('hex')
writeFileSync(join(ROOT, 'public/agent/null-agent.mjs.sha256'), `${sha}  null-agent.mjs\n`)
console.log(`agent kit: public/agent/null-agent.mjs (${(out.length / 1024).toFixed(1)} KB) sha256 ${sha.slice(0, 16)}…`)

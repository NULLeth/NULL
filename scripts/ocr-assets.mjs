// Copies the tesseract.js worker, its WebAssembly core and the English model into
// public/ocr/ so Screenshot Shield loads everything from this site (tesseract.js would
// otherwise fetch them from a CDN). Runs before dev and build; public/ocr is not in git.
import fs from 'node:fs/promises'
import path from 'node:path'

const out = 'public/ocr'
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // tesseract.js picks one of these by what the browser's WebAssembly supports
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  // LSTM "best_int": small (3 MB) and accurate on screenshots
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
]

for (const [from, to] of files) {
  const dest = path.join(out, to)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  const [a, b] = await Promise.all([fs.stat(from), fs.stat(dest).catch(() => null)])
  if (b && b.size === a.size && b.mtimeMs >= a.mtimeMs) continue
  await fs.copyFile(from, dest)
}
console.log(`ocr assets → ${out}`)

import { cachedBytes, loadOrt, type Ort } from './ort'

/**
 * Face Shield: finds faces in an attached photo and blurs them in the browser, before the
 * photo is sent. Detector: Ultra-Light-Fast-Generic-Face-Detector-1MB (RFB-640, MIT licence,
 * ~1.6 MB), run with onnxruntime-web. A face is shrunk to a few pixels and smoothed back up,
 * so what made it recognisable is gone from the image, not just covered.
 */

const MODEL_URL = '/models/ultraface/version-RFB-640.onnx'
const CACHE = 'null-faces-v1'
const IN_W = 640
const IN_H = 480
/** detector confidence for a face; lower finds more, with more false alarms */
const MIN_SCORE = 0.62
const NMS_IOU = 0.3

export interface Face {
  x: number
  y: number
  w: number
  h: number
  score: number
}

let model: Promise<{ ort: Ort; session: import('onnxruntime-web/wasm').InferenceSession }> | null = null

function load() {
  model ??= (async () => {
    const [ort, bytes] = await Promise.all([loadOrt(), cachedBytes(CACHE, MODEL_URL)])
    const session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] })
    return { ort, session }
  })().catch((e) => {
    model = null
    throw e
  })
  return model
}

const iou = (a: Face, b: Face) => {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  return inter / (a.w * a.h + b.w * b.h - inter || 1)
}

/** Faces in a picture, in its own pixel coordinates. */
export async function findFaces(src: HTMLCanvasElement): Promise<Face[]> {
  const { ort, session } = await load()
  const c = document.createElement('canvas')
  c.width = IN_W
  c.height = IN_H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0, IN_W, IN_H)
  const px = ctx.getImageData(0, 0, IN_W, IN_H).data
  const plane = IN_W * IN_H
  const input = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    input[i] = (px[i * 4] - 127) / 128
    input[plane + i] = (px[i * 4 + 1] - 127) / 128
    input[2 * plane + i] = (px[i * 4 + 2] - 127) / 128
  }
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, IN_H, IN_W]) })
  const scores = out.scores?.data as Float32Array
  const boxes = out.boxes?.data as Float32Array
  if (!scores || !boxes) return []
  const found: Face[] = []
  for (let i = 0; i < scores.length / 2; i++) {
    const s = scores[i * 2 + 1]
    if (s < MIN_SCORE) continue
    const x1 = Math.max(0, boxes[i * 4]) * src.width
    const y1 = Math.max(0, boxes[i * 4 + 1]) * src.height
    const x2 = Math.min(1, boxes[i * 4 + 2]) * src.width
    const y2 = Math.min(1, boxes[i * 4 + 3]) * src.height
    if (x2 - x1 < 4 || y2 - y1 < 4) continue
    found.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1, score: s })
  }
  // keep the strongest box of each overlapping group
  found.sort((a, b) => b.score - a.score)
  const kept: Face[] = []
  for (const f of found) if (kept.every((k) => iou(k, f) < NMS_IOU)) kept.push(f)
  return kept
}

/** A copy of the picture with every face made unrecognisable. */
export function blurFaces(src: HTMLCanvasElement, faces: Face[]): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  for (const f of faces) {
    // a little larger than the detector's box: hairline, ears, chin
    const w = f.w * 1.35
    const h = f.h * 1.4
    const x = Math.max(0, f.x + f.w / 2 - w / 2)
    const y = Math.max(0, f.y + f.h / 2 - h / 2 - f.h * 0.05)
    const bw = Math.min(w, out.width - x)
    const bh = Math.min(h, out.height - y)
    // shrink to a handful of pixels: that is where the identity is lost
    const cells = 6
    const small = document.createElement('canvas')
    small.width = cells
    small.height = Math.max(2, Math.round((cells * bh) / bw))
    const sctx = small.getContext('2d')!
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(out, x, y, bw, bh, 0, 0, small.width, small.height)
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(x + bw / 2, y + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.filter = `blur(${Math.max(4, Math.round(bw / 9))}px)`
    // drawn slightly oversized so the blur has no dark edge
    ctx.drawImage(small, x - bw * 0.1, y - bh * 0.1, bw * 1.2, bh * 1.2)
    ctx.restore()
  }
  return out
}

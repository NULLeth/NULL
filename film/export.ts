// (Same exporter as the e/pad film workshop.)
// Rendering a film to an MP4 in the browser: every frame is drawn, encoded to H.264 with
// WebCodecs, and written into the file together with the rendered sound (AAC).

import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { renderSound } from './audio'
import type { Film } from './films'

export interface RenderOptions {
  width: number
  height: number
  fps: number
  /** bits per second */
  bitrate: number
  onProgress?: (done: number, total: number, stage: string) => void
}

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

async function pickCodec(width: number, height: number, fps: number, bitrate: number): Promise<VideoEncoderConfig> {
  // High profile first (levels 5.1, 4.2), then Main, then Baseline
  for (const codec of ['avc1.640033', 'avc1.64002a', 'avc1.4d402a', 'avc1.42e02a']) {
    const config: VideoEncoderConfig = { codec, width, height, bitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } }
    if ((await VideoEncoder.isConfigSupported(config)).supported) return config
  }
  throw new Error('This browser cannot encode H.264 at this size. Use a recent Chrome or Edge.')
}

export async function renderFilm(film: Film, canvas: HTMLCanvasElement, options: RenderOptions): Promise<Blob> {
  if (!('VideoEncoder' in window)) throw new Error('This browser has no WebCodecs. Use a recent Chrome or Edge.')
  const { width, height, fps, bitrate } = options
  const progress = options.onProgress ?? (() => {})
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })!
  const frames = Math.round(film.duration * fps)

  progress(0, frames, 'sound')
  const sound = await renderSound(film.sound, film.duration)
  const audioConfig: AudioEncoderConfig = { codec: 'mp4a.40.2', sampleRate: sound.sampleRate, numberOfChannels: 2, bitrate: 192_000 }
  const withAudio = 'AudioEncoder' in window && (await AudioEncoder.isConfigSupported(audioConfig)).supported

  const videoConfig = await pickCodec(width, height, fps, bitrate)
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    audio: withAudio ? { codec: 'aac', sampleRate: sound.sampleRate, numberOfChannels: 2 } : undefined,
    fastStart: 'in-memory',
  })

  let failure: Error | null = null
  const video = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      failure = e
    },
  })
  video.configure(videoConfig)

  const frameDuration = 1_000_000 / fps
  for (let i = 0; i < frames; i++) {
    if (failure) throw failure
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    film.draw(ctx, width, height, i / fps)
    const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameDuration), duration: Math.round(frameDuration) })
    video.encode(frame, { keyFrame: i % (fps * 2) === 0 })
    frame.close()
    // (let the encoder keep up, and the page stay alive)
    while (video.encodeQueueSize > 6) await pause()
    if (i % 6 === 0) {
      progress(i, frames, 'frames')
      await pause()
    }
  }
  await video.flush()
  video.close()
  if (failure) throw failure

  if (withAudio) {
    progress(frames, frames, 'sound')
    const audio = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        failure = e
      },
    })
    audio.configure(audioConfig)
    const left = sound.getChannelData(0)
    const right = sound.getChannelData(1)
    const BLOCK = 4096
    for (let offset = 0; offset < sound.length; offset += BLOCK) {
      const size = Math.min(BLOCK, sound.length - offset)
      const data = new Float32Array(size * 2)
      data.set(left.subarray(offset, offset + size), 0)
      data.set(right.subarray(offset, offset + size), size)
      const block = new AudioData({
        format: 'f32-planar',
        sampleRate: sound.sampleRate,
        numberOfFrames: size,
        numberOfChannels: 2,
        timestamp: Math.round((offset / sound.sampleRate) * 1_000_000),
        data,
      })
      audio.encode(block)
      block.close()
    }
    await audio.flush()
    audio.close()
    if (failure) throw failure
  }

  muxer.finalize()
  progress(frames, frames, 'done')
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}

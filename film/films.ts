import { launchSound, type Soundtrack } from './audio'
import { DURATION, drawLaunch } from './launch'

export interface Film {
  duration: number
  sound: Soundtrack
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void
  ready?: () => Promise<void>
}

export const FILMS: Record<string, Film> = {
  launch: { duration: DURATION, sound: launchSound, draw: drawLaunch },
}

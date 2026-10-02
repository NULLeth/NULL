import { howSound, launchSound, type Soundtrack } from './audio'
import { HOW_DURATION, drawHow } from './how'
import { DURATION, drawLaunch } from './launch'

export interface Film {
  duration: number
  sound: Soundtrack
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void
  ready?: () => Promise<void>
}

export const FILMS: Record<string, Film> = {
  launch: { duration: DURATION, sound: launchSound, draw: drawLaunch },
  how: { duration: HOW_DURATION, sound: howSound, draw: drawHow },
}

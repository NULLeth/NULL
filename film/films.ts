import { chatSound, howSound, launchSound, modelsSound, webSound, type Soundtrack } from './audio'
import { CHAT_DURATION, drawChat } from './chat'
import { HOW_DURATION, drawHow } from './how'
import { DURATION, drawLaunch } from './launch'
import { WEB_DURATION, drawWeb } from './web'
import { MODELS_DURATION, drawModels } from './models'

export interface Film {
  duration: number
  sound: Soundtrack
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void
  ready?: () => Promise<void>
}

export const FILMS: Record<string, Film> = {
  models: { duration: MODELS_DURATION, sound: modelsSound, draw: drawModels },
  web: { duration: WEB_DURATION, sound: webSound, draw: drawWeb },
  launch: { duration: DURATION, sound: launchSound, draw: drawLaunch },
  how: { duration: HOW_DURATION, sound: howSound, draw: drawHow },
  chat: { duration: CHAT_DURATION, sound: chatSound, draw: drawChat },
}

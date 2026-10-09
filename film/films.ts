import { agentsSound, aiShieldSound, chatSound, facesSound, filesSound, screenshotSound, voiceSound, compareSound, howSound, imageSound, launchSound, modelsSound, shieldSound, torSound, webSound, type Soundtrack } from './audio'
import { CHAT_DURATION, drawChat } from './chat'
import { HOW_DURATION, drawHow } from './how'
import { DURATION, drawLaunch } from './launch'
import { WEB_DURATION, drawWeb } from './web'
import { MODELS_DURATION, drawModels } from './models'
import { IMAGE_DURATION, drawImageFilm } from './image'
import { TOR_DURATION, drawTor } from './tor'
import { SHIELD_DURATION, drawShield } from './shield'
import { COMPARE_DURATION, drawCompare } from './compare'
import { AGENTS_DURATION, drawAgents } from './agents'
import { AISHIELD_DURATION, drawAiShield } from './aishield'
import { FILES_DURATION, drawFiles } from './files'
import { VOICE_DURATION, drawVoice } from './voice'
import { FACES_DURATION, drawFaces } from './faces'
import { SCREENSHOT_DURATION, drawScreenshot } from './screenshot'

export interface Film {
  duration: number
  sound: Soundtrack
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void
  ready?: () => Promise<void>
}

export const FILMS: Record<string, Film> = {
  screenshot: { duration: SCREENSHOT_DURATION, sound: screenshotSound, draw: drawScreenshot },
  faces: { duration: FACES_DURATION, sound: facesSound, draw: drawFaces },
  voice: { duration: VOICE_DURATION, sound: voiceSound, draw: drawVoice },
  files: { duration: FILES_DURATION, sound: filesSound, draw: drawFiles },
  aishield: { duration: AISHIELD_DURATION, sound: aiShieldSound, draw: drawAiShield },
  agents: { duration: AGENTS_DURATION, sound: agentsSound, draw: drawAgents },
  compare: { duration: COMPARE_DURATION, sound: compareSound, draw: drawCompare },
  shield: { duration: SHIELD_DURATION, sound: shieldSound, draw: drawShield },
  tor: { duration: TOR_DURATION, sound: torSound, draw: drawTor },
  image: { duration: IMAGE_DURATION, sound: imageSound, draw: drawImageFilm },
  models: { duration: MODELS_DURATION, sound: modelsSound, draw: drawModels },
  web: { duration: WEB_DURATION, sound: webSound, draw: drawWeb },
  launch: { duration: DURATION, sound: launchSound, draw: drawLaunch },
  how: { duration: HOW_DURATION, sound: howSound, draw: drawHow },
  chat: { duration: CHAT_DURATION, sound: chatSound, draw: drawChat },
}

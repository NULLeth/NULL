import { MotionConfig } from 'framer-motion'
import { Fragment } from 'react'
import { IS_LIVE } from './config/mode'
import { LiveProvider } from './live/LiveProvider'
import { ChatPage } from './chat/ChatPage'
import { Dashboard } from './dashboard/Dashboard'
import { ModalRoot } from './modals/ModalRoot'
import { About } from './sections/About'
import { Agents } from './sections/Agents'
import { Architecture } from './sections/Architecture'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { Nav } from './sections/Nav'
import { Services } from './sections/Services'
import { Stats } from './sections/Stats'
import { NullProvider } from './state/store'
import { UiProvider } from './state/ui'

/** Mounts the zkAPI SDK only when the page runs live. */
const LiveOrNot = IS_LIVE ? LiveProvider : Fragment

const IS_CHAT = (globalThis.location?.pathname ?? '/').replace(/\/+$/, '').toLowerCase() === '/chat'

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <NullProvider>
        <LiveOrNot>
        <UiProvider>
          {IS_CHAT ? (
            <ChatPage />
          ) : (
            <>
              <Nav />
              <main>
                <Hero />
                <Architecture />
                <Dashboard />
                <Services />
                <Agents />
                <Stats />
                <About />
              </main>
              <Footer />
            </>
          )}
          <ModalRoot />
        </UiProvider>
        </LiveOrNot>
      </NullProvider>
    </MotionConfig>
  )
}

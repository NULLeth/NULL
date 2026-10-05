import { MotionConfig } from 'framer-motion'
import { Fragment, Suspense, lazy } from 'react'
import { IS_LIVE } from './config/mode'
import { LiveProvider } from './live/LiveProvider'
import { ChatPage } from './chat/ChatPage'
import { Dashboard } from './dashboard/Dashboard'
import { ModalRoot } from './modals/ModalRoot'
import { About } from './sections/About'
import { Burn } from './sections/Burn'
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

const PATH = (globalThis.location?.pathname ?? '/').replace(/\/+$/, '').toLowerCase()
const IS_CHAT = PATH === '/chat'
const IS_STUDIO = PATH === '/studio'
const IS_BURN = PATH === '/burn'
const IS_AGENTS = PATH === '/agents'
/** Studio is a private tool page; it and the film code load only on /studio. */
const StudioPage = lazy(() => import('./studio/StudioPage'))
/** The creator's buyback tool, also unlinked. */
const BurnPage = lazy(() => import('./burn/BurnPage'))
/** The NULL Agent Kit page. */
const AgentsPage = lazy(() => import('./agents/AgentsPage'))

export function App() {
  if (IS_STUDIO || IS_BURN || IS_AGENTS) {
    return (
      <Suspense fallback={<div className="min-h-[100dvh] bg-bg" />}>
        {IS_AGENTS ? <AgentsPage /> : IS_BURN ? <BurnPage /> : <StudioPage />}
      </Suspense>
    )
  }
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
                <Burn />
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

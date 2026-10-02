import { MotionConfig } from 'framer-motion'
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

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <NullProvider>
        <UiProvider>
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
          <ModalRoot />
        </UiProvider>
      </NullProvider>
    </MotionConfig>
  )
}

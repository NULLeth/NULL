import { PROJECT } from '../config/project'
import { MockPrivateAccessClient } from './mockClient'
import { MockServiceRouter } from './mockRouter'
import type { PrivateAccessClient, ServiceRouter } from './types'

/**
 * The single place where the app picks its protocol backend.
 * To go live: implement PrivateAccessClient / ServiceRouter against the real
 * zkAPI deployment and return them here when PROJECT.backend === 'zkapi'.
 */
function createBackend(): { access: PrivateAccessClient; router: ServiceRouter; simulated: boolean } {
  switch (PROJECT.backend) {
    case 'mock':
    default:
      return { access: new MockPrivateAccessClient(), router: new MockServiceRouter(), simulated: true }
  }
}

export const backend = createBackend()

export * from './types'
export { SERVICES, MORE_ROUTES, GROUP_LABEL, FEED_LABEL, serviceById } from './catalog'
export { PROTOCOL_FEE } from './mockClient'

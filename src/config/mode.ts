/**
 * Which experience the page runs.
 *  - 'demo': everything simulated in the browser (screenshots, explaining the product).
 *  - 'live': real zkAPI on Ethereum mainnet via the Open Anonymity deployment.
 *
 * Default comes from VITE_NULL_MODE at build time; the paths /live and /demo
 * (or ?live / ?demo) override it so both can be opened from the same deployment.
 */
export type AppMode = 'live' | 'demo'

function resolveMode(): AppMode {
  const path = (globalThis.location?.pathname ?? '/').replace(/\/+$/, '').toLowerCase()
  if (path === '/demo') return 'demo'
  if (path === '/live') return 'live'
  const params = new URLSearchParams(globalThis.location?.search ?? '')
  if (params.has('demo')) return 'demo'
  if (params.has('live')) return 'live'
  return import.meta.env.VITE_NULL_MODE === 'live' ? 'live' : 'demo'
}

export const MODE: AppMode = resolveMode()
export const IS_LIVE = MODE === 'live'

/** Link that opens the other mode. */
export function otherModeHref(): string {
  return IS_LIVE ? '/demo' : '/live'
}

export const LIVE = {
  network: 'Ethereum Mainnet',
  chainId: 1,
  vault: '0x4386FDbdA35D995beB3BF8625118Ec5982ec81fe',
  rpcUrl: 'https://ethereum-rpc.publicnode.com',
  /** Product-side cap while the protocol is experimental and unaudited. */
  depositCapEth: 0.05,
  depositPresetsEth: [0.005, 0.01, 0.025],
  /** USD cap of each short-lived key; the SDK only charges actual usage. */
  spendingLimitUsd: 1,
  noteTtlDays: 30,
  operator: 'Open Anonymity',
  models: {
    claude: 'anthropic/claude-sonnet-5.5',
    gpt: 'openai/gpt-6.1-sol',
    openrouter: 'openrouter/auto',
  } as Record<string, string>,
} as const

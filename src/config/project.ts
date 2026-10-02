/**
 * Project-level configuration. Everything a launch needs to change lives here.
 */
export const PROJECT = {
  name: 'NULL',
  domain: 'nullzk.com',
  tagline: 'Private access to the machine economy.',
  secondary: 'Fund once. Access any API privately.',
  core: 'One private balance. Every API.',

  xHandle: '@NULL_zk',

  /** Token contract, shown in the hero (and on the film's end card) once set. Empty hides it. */
  token: {
    ticker: '$NULL' as string,
    name: 'NULL zk',
    ca: '0x51aAa1D6eb8aDFF4Dd73518b825Fc0fE56627160' as string,
    /** dexscreener chain slug */
    chain: 'ethereum',
  },

  links: {
    x: 'https://x.com/NULL_zk',
    github: 'https://github.com/NULLeth/NULL',
    ethereum: 'https://ethereum.org/',
    zkapiAnnouncement: 'https://blog.ethereum.org/2026/10/01/introducing-zkapi',
    zkapiResearch: 'https://ethresear.ch/t/zk-api-usage-credits-llms-and-beyond/24104',
  },

  /**
   * Which protocol backend the app talks to.
   * 'mock' = fully simulated in the browser (no transactions, no real API calls).
   * Swap in a real zkAPI client in src/protocol/index.ts when it exists.
   */
  backend: 'mock' as 'mock' | 'zkapi',

  /** Reference price used to show USD equivalents in demo mode. */
  ethUsd: 3661.2,

  /** Size of the shared deposit pool the demo pretends to belong to. */
  anonymitySetBase: 48_213,
} as const

export const CHAINS: Record<number, string> = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  17000: 'Holesky',
  560048: 'Hoodi',
  8453: 'Base',
  10: 'Optimism',
  42161: 'Arbitrum',
}

/**
 * Which experience the page runs.
 *  - 'demo': everything simulated in the browser (screenshots, explaining the product).
 *  - 'live': real zkAPI on Ethereum mainnet via the Open Anonymity deployment.
 *
 * Live is the default (set VITE_NULL_MODE=demo at build time to flip it); the
 * paths /live and /demo (or ?live / ?demo) override it on the same deployment.
 */
export type AppMode = 'live' | 'demo'

function resolveMode(): AppMode {
  const path = (globalThis.location?.pathname ?? '/').replace(/\/+$/, '').toLowerCase()
  if (path === '/demo') return 'demo'
  if (path === '/live') return 'live'
  const params = new URLSearchParams(globalThis.location?.search ?? '')
  if (params.has('demo')) return 'demo'
  if (params.has('live')) return 'live'
  return import.meta.env.VITE_NULL_MODE === 'demo' ? 'demo' : 'live'
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
  depositCapEth: 0.1,
  depositPresetsEth: [0.025, 0.05, 0.1],
  /** USD cap of each short-lived key; the SDK only charges actual usage. */
  spendingLimitUsd: 1,
  noteTtlDays: 30,
  /**
   * Gas a vault deposit uses (on-chain Poseidon Merkle insert), measured on
   * mainnet 2026-10-02: ~6.74M regardless of the amount deposited.
   */
  depositGas: 6_750_000,
  /** Gas a cooperative close/withdrawal uses (Groth16 verify on-chain), ~7.05M. */
  withdrawGas: 7_050_000,
  /** Above this share of the deposit, the fund dialog warns that gas is expensive. */
  feeWarnShare: 0.2,
  operator: 'Open Anonymity',
  /** Models offered in NULL Chat (OpenRouter ids). */
  /**
   * Models offered in NULL Chat, grouped by vendor in the picker. Each has
   * zero-data-retention endpoints on OpenRouter, so a ZDR-only key can reach it.
   */
  chatModels: [
    { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', vendor: 'Anthropic' },
    { id: 'anthropic/claude-opus-5.5', label: 'Claude Opus 5.5', vendor: 'Anthropic' },
    { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', vendor: 'Anthropic' },
    { id: 'openai/gpt-6.1-sol', label: 'GPT-6.1', vendor: 'OpenAI' },
    { id: 'openai/gpt-6-luna', label: 'GPT-6 Luna', vendor: 'OpenAI' },
    { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash', vendor: 'Google' },
    { id: 'x-ai/grok-4.7', label: 'Grok 4.7', vendor: 'xAI' },
    { id: 'deepseek/deepseek-v4-pro-0813', label: 'DeepSeek V4 Pro', vendor: 'DeepSeek' },
    { id: 'moonshotai/kimi-k3', label: 'Kimi K3', vendor: 'Moonshot AI' },
    { id: 'z-ai/glm-5.3', label: 'GLM 5.3', vendor: 'Z.ai' },
    { id: 'mistralai/mistral-medium-3-5', label: 'Mistral Medium 3.5', vendor: 'Mistral' },
    { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', vendor: 'Meta' },
    { id: 'openrouter/auto', label: 'Auto · OpenRouter', vendor: 'Auto' },
  ],
  /**
   * Image models (OpenRouter image API), each with zero-data-retention endpoints.
   * `approxUsd` is a typical 1K image; the exact charge comes back with each image.
   */
  imageModels: [
    { id: 'google/gemini-3.1-flash-image', label: 'Nano Banana 2', vendor: 'Google', approxUsd: 0.07 },
    { id: 'google/gemini-3-pro-image', label: 'Nano Banana Pro', vendor: 'Google', approxUsd: 0.14 },
    { id: 'google/gemini-3.1-flash-lite-image', label: 'Nano Banana 2 Lite', vendor: 'Google', approxUsd: 0.04 },
  ],
  models: {
    claude: 'anthropic/claude-sonnet-5.5',
    gpt: 'openai/gpt-6.1-sol',
    openrouter: 'openrouter/auto',
  } as Record<string, string>,
} as const

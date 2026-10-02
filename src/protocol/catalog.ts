import { IS_LIVE } from '../config/mode'
import type { ServiceGroup, ServiceId, ServiceInfo } from './types'

const CATALOG: ServiceInfo[] = [
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    category: 'AI MODEL',
    group: 'ai',
    kind: 'chat',
    description: 'Anthropic models through private billing.',
    priceUsd: 0.012,
    unit: 'REQUEST',
    route: 'anthropic/claude',
    latencyMs: 840,
    status: 'online',
  },
  {
    id: 'gpt',
    name: 'GPT',
    vendor: 'OpenAI',
    category: 'AI MODEL',
    group: 'ai',
    kind: 'chat',
    description: 'OpenAI models, paid per request from your private balance.',
    priceUsd: 0.01,
    unit: 'REQUEST',
    route: 'openai/gpt',
    latencyMs: 910,
    status: 'online',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    vendor: 'OpenRouter',
    category: 'AI ROUTER',
    group: 'ai',
    kind: 'chat',
    description: 'Hundreds of open and frontier models behind one private route.',
    priceUsd: 0.008,
    unit: 'REQUEST',
    route: 'openrouter/auto',
    latencyMs: 1020,
    status: 'online',
  },
  {
    id: 'eth-rpc',
    name: 'Ethereum RPC',
    vendor: 'NULL relay pool',
    category: 'BLOCKCHAIN',
    group: 'blockchain',
    kind: 'rpc',
    description: 'Read the chain without tying calls to the wallet that pays.',
    priceUsd: 0.0008,
    unit: 'CALL',
    route: 'ethereum/mainnet',
    latencyMs: 62,
    status: 'online',
  },
  {
    id: 'web-search',
    name: 'Web Search',
    vendor: 'Search index',
    category: 'DATA',
    group: 'data',
    kind: 'search',
    description: 'Live web results for people and agents, no account attached.',
    priceUsd: 0.0021,
    unit: 'QUERY',
    route: 'data/search',
    latencyMs: 380,
    status: 'online',
  },
  {
    id: 'image-gen',
    name: 'Image Generation',
    vendor: 'Diffusion pool',
    category: 'MEDIA',
    group: 'media',
    kind: 'image',
    description: 'Generate images from a prompt. Billing stays unlinked.',
    priceUsd: 0.04,
    unit: 'IMAGE',
    route: 'media/image',
    latencyMs: 3200,
    status: 'online',
  },
]

/**
 * In live mode the zkAPI mainnet deployment routes AI models via OpenRouter, and
 * web search rides on the same key (OpenRouter's web plugin, used in NULL Chat).
 * RPC and media routes are shown as coming soon.
 */
export const SERVICES: ServiceInfo[] = CATALOG.map((s) => {
  if (!IS_LIVE || s.kind === 'chat') return s
  if (s.kind === 'search') return { ...s, vendor: 'OpenRouter web', latencyMs: 3500, description: 'Live web answers with sources, inside NULL Chat. No account attached.' }
  return { ...s, status: 'soon' }
})

/** Further routes the network serves that the demo doesn't expose as cards. */
export const MORE_ROUTES = ['Embeddings', 'Speech-to-text', 'Price feeds', 'IPFS pinning', 'Translation', 'Code sandbox']

export const GROUP_LABEL: Record<ServiceGroup, string> = {
  ai: 'AI',
  blockchain: 'BLOCKCHAIN',
  data: 'DATA',
  media: 'MEDIA',
}

/** Short labels used in activity feeds ("SEARCH", "ETH RPC"). */
export const FEED_LABEL: Record<ServiceId, string> = {
  claude: 'CLAUDE',
  gpt: 'GPT',
  openrouter: 'OPENROUTER',
  'eth-rpc': 'ETH RPC',
  'web-search': 'SEARCH',
  'image-gen': 'IMAGE',
}

export function serviceById(id: ServiceId): ServiceInfo {
  return SERVICES.find((s) => s.id === id) ?? SERVICES[0]
}

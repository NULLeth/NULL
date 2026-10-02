import { serviceById, type ServiceId } from '../protocol'
import { ethToUsd, usdToEth } from '../lib/format'
import { pick, rand, randHex, randId } from '../lib/random'
import type { ActivityEvent, Agent, Capability, NullState } from './types'

/** What an autonomous agent plausibly does with each capability. */
const TASKS: Record<ServiceId, string[]> = {
  claude: ['summarize 6 sources', 'draft daily market brief', 'rank 12 governance proposals', 'extract entities from filing', 'review contract diff'],
  gpt: ['classify 40 transactions', 'translate forum thread', 'outline research memo', 'score sentiment on 80 posts'],
  openrouter: ['route: cheapest model for tagging', 'batch-label 120 headlines', 'compare 3 model answers'],
  'eth-rpc': ['eth_getLogs · Transfer', 'eth_call · balanceOf', 'eth_feeHistory · 20 blocks', 'eth_getTransactionReceipt', 'eth_blockNumber'],
  'web-search': ['query "blob fee market"', 'query "l2 sequencer uptime"', 'query "restaking yields"', 'query "stablecoin supply by chain"', 'query "mev-boost relay stats"'],
  'image-gen': ['render report cover', 'generate chart thumbnail'],
}

const CAP_SERVICES: Record<Capability, ServiceId[]> = {
  ai: ['claude', 'claude', 'gpt', 'openrouter'],
  search: ['web-search'],
  rpc: ['eth-rpc'],
  image: ['image-gen'],
}

/** Capability weights: agents read the chain and search far more than they draw. */
const CAP_WEIGHT: Record<Capability, number> = { rpc: 4, search: 3, ai: 3, image: 0.4 }

export interface AgentAction {
  serviceId: ServiceId
  costUsd: number
  detail: string
  ref: string
}

export function nextAgentAction(agent: Agent): AgentAction {
  const caps = agent.capabilities.length ? agent.capabilities : (['search'] as Capability[])
  const total = caps.reduce((s, c) => s + CAP_WEIGHT[c], 0)
  let r = Math.random() * total
  let cap = caps[0]
  for (const c of caps) {
    r -= CAP_WEIGHT[c]
    if (r <= 0) {
      cap = c
      break
    }
  }
  const serviceId = pick(CAP_SERVICES[cap])
  const base = serviceById(serviceId).priceUsd
  const jitter = serviceId === 'claude' || serviceId === 'gpt' || serviceId === 'openrouter' ? rand(0.85, 1.4) : rand(0.92, 1.12)
  return { serviceId, costUsd: base * jitter, detail: pick(TASKS[serviceId]), ref: randHex(32) }
}

export function agentCanAfford(agent: Agent): boolean {
  // smallest possible request is an RPC call
  return agent.budgetEth > usdToEth(0.0008)
}

/** First-visit state: a funded demo vault with one agent already running. */
export function seedState(): NullState {
  const now = Date.now()
  const min = 60_000
  const spectreId = 'agt_spectre'
  const spectre: Agent = {
    id: spectreId,
    name: 'SPECTRE',
    status: 'active',
    budgetEth: 0.0478,
    initialBudgetEth: 0.05,
    requests: 32,
    spentUsd: ethToUsd(0.05 - 0.0478),
    capabilities: ['ai', 'search', 'rpc'],
    agentKey: randHex(20),
    createdAt: now - 94 * min,
    lastTask: 'eth_feeHistory · 20 blocks',
    lastTs: now - 0.4 * min,
  }

  const ev = (o: Omit<ActivityEvent, 'id'>): ActivityEvent => ({ id: randId('evt', 8), ...o })
  const history: ActivityEvent[] = [
    ev({ ts: now - 2 * 24 * 60 * min, kind: 'deposit', actor: 'YOU', amountEth: 0.2, ref: randHex(32), detail: 'note created · leaf #48,077' }),
    ev({ ts: now - 26 * 60 * min, kind: 'deposit', actor: 'YOU', amountEth: 0.1341, ref: randHex(32), detail: 'note created · leaf #48,166' }),
    ev({ ts: now - 9 * 60 * min, kind: 'request', actor: 'YOU', serviceId: 'claude', costUsd: 0.012, ref: randHex(32), detail: 'chat · 412 tokens' }),
    ev({ ts: now - 7 * 60 * min, kind: 'request', actor: 'YOU', serviceId: 'web-search', costUsd: 0.0021, ref: randHex(32), detail: 'query · 4 results' }),
    ev({ ts: now - 5 * 60 * min, kind: 'request', actor: 'YOU', serviceId: 'image-gen', costUsd: 0.04, ref: randHex(32), detail: 'image · 1024×1024' }),
    ev({ ts: now - 3 * 60 * min, kind: 'request', actor: 'YOU', serviceId: 'gpt', costUsd: 0.01, ref: randHex(32), detail: 'chat · 288 tokens' }),
    ev({ ts: now - 94 * min, kind: 'deploy', actor: 'SPECTRE', agentId: spectreId, amountEth: 0.05, detail: 'budget allocated · scope ai, search, rpc' }),
  ]
  // A short tail of agent activity so the feeds aren't empty on first paint.
  const tail: [number, ServiceId, number, string][] = [
    [11, 'web-search', 0.0021, 'query "blob fee market"'],
    [9, 'claude', 0.0142, 'summarize 6 sources'],
    [7.5, 'eth-rpc', 0.0008, 'eth_getLogs · Transfer'],
    [5, 'eth-rpc', 0.0009, 'eth_call · balanceOf'],
    [3.2, 'web-search', 0.0022, 'query "l2 sequencer uptime"'],
    [1.6, 'gpt', 0.0117, 'classify 40 transactions'],
    [0.4, 'eth-rpc', 0.0008, 'eth_feeHistory · 20 blocks'],
  ]
  for (const [m, serviceId, costUsd, detail] of tail) {
    history.push(ev({ ts: now - m * min, kind: 'agent', actor: 'SPECTRE', agentId: spectreId, serviceId, costUsd, detail, ref: randHex(32) }))
  }
  history.sort((a, b) => b.ts - a.ts)

  return {
    v: 1,
    wallet: null,
    balanceEth: 0.2841,
    notes: [
      { id: 'note_a', amountEth: 0.2, commitment: randHex(32), leafIndex: 48_077, createdAt: now - 2 * 24 * 60 * min },
      { id: 'note_b', amountEth: 0.1341, commitment: randHex(32), leafIndex: 48_166, createdAt: now - 26 * 60 * min },
    ],
    agents: [spectre],
    activity: history,
    requests: 4,
    spentUsd: 0.0641,
    sessionId: randId('ses', 8),
  }
}

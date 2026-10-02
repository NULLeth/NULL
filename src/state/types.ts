import type { ServiceId } from '../protocol'
import type { WalletInfo } from '../lib/wallet'

export type Capability = 'ai' | 'search' | 'rpc' | 'image'

export const CAPABILITY_LABEL: Record<Capability, string> = {
  ai: 'AI Models',
  search: 'Web Search',
  rpc: 'Ethereum RPC',
  image: 'Image Generation',
}

export type AgentStatus = 'active' | 'paused' | 'depleted'

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  budgetEth: number
  initialBudgetEth: number
  requests: number
  spentUsd: number
  capabilities: Capability[]
  agentKey: string
  createdAt: number
  lastTask?: string
  lastTs?: number
}

export interface Note {
  id: string
  amountEth: number
  commitment: string
  leafIndex: number
  createdAt: number
}

export type ActivityKind = 'request' | 'agent' | 'deposit' | 'withdraw' | 'deploy' | 'recall'

export interface ActivityEvent {
  id: string
  ts: number
  kind: ActivityKind
  /** "YOU" or the agent's name */
  actor: string
  agentId?: string
  serviceId?: ServiceId
  costUsd?: number
  amountEth?: number
  detail?: string
  /** nullifier / tx hash shown in mono */
  ref?: string
}

export interface NullState {
  v: 1
  wallet: WalletInfo | null
  balanceEth: number
  notes: Note[]
  agents: Agent[]
  activity: ActivityEvent[]
  requests: number
  spentUsd: number
  sessionId: string
}

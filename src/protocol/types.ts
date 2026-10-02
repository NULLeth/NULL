/**
 * Protocol interfaces. The UI only ever talks to these — the demo ships a mock
 * implementation (mockClient.ts / mockRouter.ts). A real zkAPI backend only
 * needs to implement PrivateAccessClient + ServiceRouter.
 */

export type ServiceId = 'claude' | 'gpt' | 'openrouter' | 'eth-rpc' | 'web-search' | 'image-gen'
export type ServiceGroup = 'ai' | 'blockchain' | 'data' | 'media'
export type ServiceKind = 'chat' | 'rpc' | 'search' | 'image'

export interface ServiceInfo {
  id: ServiceId
  name: string
  vendor: string
  /** "AI MODEL", "BLOCKCHAIN", … */
  category: string
  group: ServiceGroup
  kind: ServiceKind
  description: string
  priceUsd: number
  unit: string
  /** router path, e.g. anthropic/claude */
  route: string
  latencyMs: number
  status: 'online' | 'degraded'
}

export type StepPhase = 'start' | 'done'
export interface StepEvent {
  step: string
  phase: StepPhase
  detail?: string
}
export type OnStep = (e: StepEvent) => void

export interface DepositReceipt {
  noteId: string
  commitment: string
  leafIndex: number
  amountEth: number
  /** credits after protocol fee */
  creditsEth: number
  txHash: string
  /** true while the backend is the browser mock — nothing touched a chain */
  simulated: boolean
}

export interface WithdrawReceipt {
  nullifier: string
  amountEth: number
  to: string
  txHash: string
  simulated: boolean
}

/** What travels with every request instead of an API key or a payer address. */
export interface AccessProof {
  proofId: string
  nullifier: string
  root: string
  epoch: number
  system: string
  sizeBytes: number
  provingMs: number
  maxCostUsd: number
}

export interface ServiceRequest {
  serviceId: ServiceId
  input: string
  params?: Record<string, string>
}

export interface SearchHit {
  title: string
  url: string
  snippet: string
}

export type ServiceResult =
  | { kind: 'chat'; text: string; model: string; tokens: number }
  | { kind: 'rpc'; method: string; result: string }
  | { kind: 'search'; hits: SearchHit[] }
  | { kind: 'image'; seed: number; prompt: string }

export interface ServiceResponse {
  requestId: string
  status: number
  latencyMs: number
  costUsd: number
  relay: string
  result: ServiceResult
}

export interface AgentCredential {
  agentKey: string
  scope: string
}

export interface PrivateAccessClient {
  deposit(p: { amountEth: number; from: string }, onStep: OnStep): Promise<DepositReceipt>
  withdraw(p: { amountEth: number; to: string }, onStep: OnStep): Promise<WithdrawReceipt>
  authorize(p: { serviceId: ServiceId; maxCostUsd: number }, onStep: OnStep): Promise<AccessProof>
  issueAgentCredential(p: { name: string; budgetEth: number; scope: ServiceGroup[] }, onStep: OnStep): Promise<AgentCredential>
}

export interface ServiceRouter {
  send(req: ServiceRequest, proof: AccessProof, onStep: OnStep): Promise<ServiceResponse>
}

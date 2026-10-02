import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import type { DepositReceipt, ServiceId } from '../protocol'
import { usdToEth } from '../lib/format'
import { randId } from '../lib/random'
import { discoverWallets, silentReconnect, type WalletInfo } from '../lib/wallet'
import { agentCanAfford, nextAgentAction, seedState } from './sim'
import type { ActivityEvent, Agent, Capability, NullState } from './types'

const STORAGE_KEY = 'null.demo.v1'
const MAX_ACTIVITY = 160

type Action =
  | { type: 'wallet/connect'; wallet: WalletInfo }
  | { type: 'wallet/disconnect' }
  | { type: 'deposit'; receipt: DepositReceipt }
  | { type: 'withdraw'; amountEth: number; to: string; ref: string }
  | { type: 'spend'; serviceId: ServiceId; costUsd: number; ref: string; detail: string }
  | { type: 'agent/deploy'; agent: Agent }
  | { type: 'agent/tick'; agentId: string; serviceId: ServiceId; costUsd: number; detail: string; ref: string }
  | { type: 'agent/toggle'; agentId: string }
  | { type: 'agent/recall'; agentId: string }
  | { type: 'reset' }

function push(activity: ActivityEvent[], e: Omit<ActivityEvent, 'id' | 'ts'>): ActivityEvent[] {
  return [{ id: randId('evt', 8), ts: Date.now(), ...e }, ...activity].slice(0, MAX_ACTIVITY)
}

function reducer(s: NullState, a: Action): NullState {
  switch (a.type) {
    case 'wallet/connect':
      return { ...s, wallet: a.wallet }
    case 'wallet/disconnect':
      return { ...s, wallet: null }
    case 'deposit': {
      const r = a.receipt
      return {
        ...s,
        balanceEth: s.balanceEth + r.creditsEth,
        notes: [...s.notes, { id: r.noteId, amountEth: r.creditsEth, commitment: r.commitment, leafIndex: r.leafIndex, createdAt: Date.now() }],
        activity: push(s.activity, {
          kind: 'deposit',
          actor: 'YOU',
          amountEth: r.amountEth,
          ref: r.commitment,
          detail: `note created · leaf #${r.leafIndex.toLocaleString('en-US')}`,
        }),
      }
    }
    case 'withdraw':
      return {
        ...s,
        balanceEth: Math.max(0, s.balanceEth - a.amountEth),
        activity: push(s.activity, { kind: 'withdraw', actor: 'YOU', amountEth: a.amountEth, ref: a.ref, detail: `to ${a.to.slice(0, 5)}…${a.to.slice(-3)}` }),
      }
    case 'spend':
      return {
        ...s,
        balanceEth: Math.max(0, s.balanceEth - usdToEth(a.costUsd)),
        requests: s.requests + 1,
        spentUsd: s.spentUsd + a.costUsd,
        activity: push(s.activity, { kind: 'request', actor: 'YOU', serviceId: a.serviceId, costUsd: a.costUsd, ref: a.ref, detail: a.detail }),
      }
    case 'agent/deploy':
      return {
        ...s,
        balanceEth: Math.max(0, s.balanceEth - a.agent.initialBudgetEth),
        agents: [a.agent, ...s.agents],
        activity: push(s.activity, {
          kind: 'deploy',
          actor: a.agent.name,
          agentId: a.agent.id,
          amountEth: a.agent.initialBudgetEth,
          detail: `budget allocated · scope ${a.agent.capabilities.join(', ')}`,
        }),
      }
    case 'agent/tick': {
      const agent = s.agents.find((x) => x.id === a.agentId)
      if (!agent || agent.status !== 'active') return s
      const costEth = usdToEth(a.costUsd)
      if (agent.budgetEth < costEth) {
        return { ...s, agents: s.agents.map((x) => (x.id === agent.id ? { ...x, status: 'depleted' } : x)) }
      }
      const next: Agent = {
        ...agent,
        budgetEth: agent.budgetEth - costEth,
        requests: agent.requests + 1,
        spentUsd: agent.spentUsd + a.costUsd,
        lastTask: a.detail,
        lastTs: Date.now(),
      }
      if (!agentCanAfford(next)) next.status = 'depleted'
      return {
        ...s,
        agents: s.agents.map((x) => (x.id === agent.id ? next : x)),
        activity: push(s.activity, {
          kind: 'agent',
          actor: agent.name,
          agentId: agent.id,
          serviceId: a.serviceId,
          costUsd: a.costUsd,
          detail: a.detail,
          ref: a.ref,
        }),
      }
    }
    case 'agent/toggle':
      return {
        ...s,
        agents: s.agents.map((x) =>
          x.id === a.agentId && x.status !== 'depleted' ? { ...x, status: x.status === 'active' ? 'paused' : 'active' } : x,
        ),
      }
    case 'agent/recall': {
      const agent = s.agents.find((x) => x.id === a.agentId)
      if (!agent) return s
      return {
        ...s,
        balanceEth: s.balanceEth + agent.budgetEth,
        agents: s.agents.filter((x) => x.id !== agent.id),
        activity: push(s.activity, {
          kind: 'recall',
          actor: agent.name,
          agentId: agent.id,
          amountEth: agent.budgetEth,
          detail: 'remaining budget returned · credential revoked',
        }),
      }
    }
    case 'reset':
      return seedState()
  }
}

function load(): NullState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as NullState
      if (parsed?.v === 1 && Array.isArray(parsed.agents) && Array.isArray(parsed.activity)) return parsed
    }
  } catch {
    /* corrupted or blocked storage — start fresh */
  }
  return seedState()
}

interface NullApi {
  state: NullState
  connectWallet(w: WalletInfo): void
  disconnectWallet(): void
  applyDeposit(r: DepositReceipt): void
  applyWithdraw(amountEth: number, to: string, ref: string): void
  spend(serviceId: ServiceId, costUsd: number, ref: string, detail: string): void
  deployAgent(p: { name: string; budgetEth: number; capabilities: Capability[]; agentKey: string }): Agent
  toggleAgent(id: string): void
  recallAgent(id: string): void
  reset(): void
}

const Ctx = createContext<NullApi | null>(null)

export function NullProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const stateRef = useRef(state)
  stateRef.current = state

  // Persist (throttled) so a refresh keeps the demo where it was.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        /* storage full / blocked — demo still works in memory */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [state])

  // Re-attach an injected wallet after reload, or drop it if it's gone.
  useEffect(() => {
    const w = stateRef.current.wallet
    if (!w || w.kind !== 'injected') return
    let settled = false
    const stop = discoverWallets(async (list) => {
      const match = list.find((x) => x.rdns === w.rdns) ?? list[0]
      if (!match || settled) return
      settled = true
      const info = await silentReconnect(match)
      dispatch(info ? { type: 'wallet/connect', wallet: info } : { type: 'wallet/disconnect' })
    })
    const giveUp = setTimeout(() => {
      if (!settled) dispatch({ type: 'wallet/disconnect' })
    }, 2500)
    return () => {
      stop()
      clearTimeout(giveUp)
    }
  }, [])

  // The agents' heartbeat: every few seconds one active agent spends privately.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const loop = () => {
      const active = stateRef.current.agents.filter((a) => a.status === 'active')
      if (active.length && !document.hidden) {
        const agent = active[Math.floor(Math.random() * active.length)]
        const act = nextAgentAction(agent)
        dispatch({ type: 'agent/tick', agentId: agent.id, ...act })
      }
      const base = active.length > 1 ? 2000 : 2800
      timer = setTimeout(loop, base + Math.random() * 3200)
    }
    timer = setTimeout(loop, 1800)
    return () => clearTimeout(timer)
  }, [])

  const deployAgent = useCallback<NullApi['deployAgent']>((p) => {
    const agent: Agent = {
      id: randId('agt', 8),
      name: p.name,
      status: 'active',
      budgetEth: p.budgetEth,
      initialBudgetEth: p.budgetEth,
      requests: 0,
      spentUsd: 0,
      capabilities: p.capabilities,
      agentKey: p.agentKey,
      createdAt: Date.now(),
      lastTask: 'awaiting first task',
    }
    dispatch({ type: 'agent/deploy', agent })
    return agent
  }, [])

  const api = useMemo<NullApi>(
    () => ({
      state,
      connectWallet: (wallet) => dispatch({ type: 'wallet/connect', wallet }),
      disconnectWallet: () => dispatch({ type: 'wallet/disconnect' }),
      applyDeposit: (receipt) => dispatch({ type: 'deposit', receipt }),
      applyWithdraw: (amountEth, to, ref) => dispatch({ type: 'withdraw', amountEth, to, ref }),
      spend: (serviceId, costUsd, ref, detail) => dispatch({ type: 'spend', serviceId, costUsd, ref, detail }),
      deployAgent,
      toggleAgent: (agentId) => dispatch({ type: 'agent/toggle', agentId }),
      recallAgent: (agentId) => dispatch({ type: 'agent/recall', agentId }),
      reset: () => {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
        dispatch({ type: 'reset' })
      },
    }),
    [state, deployAgent],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useNull(): NullApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNull outside NullProvider')
  return v
}

/** Convenience: total ETH currently allocated to agents. */
export function allocatedToAgents(s: NullState): number {
  return s.agents.reduce((sum, a) => sum + a.budgetEth, 0)
}


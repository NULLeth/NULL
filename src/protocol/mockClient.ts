import { fmtInt, shortHex } from '../lib/format'
import { networkSnapshot } from '../lib/network'
import { randHex, randId, randInt, sleep } from '../lib/random'
import { estimatedHead } from './responses'
import type { AccessProof, AgentCredential, DepositReceipt, OnStep, PrivateAccessClient, WithdrawReceipt } from './types'

export const PROTOCOL_FEE = 0.001

/**
 * Browser-only stand-in for a zkAPI client. It walks through the same phases a
 * real deposit / proof would, with realistic timings, but never touches a chain.
 * Every receipt is flagged `simulated: true`.
 */
export class MockPrivateAccessClient implements PrivateAccessClient {
  async deposit({ amountEth }: { amountEth: number; from: string }, onStep: OnStep): Promise<DepositReceipt> {
    const txHash = randHex(32)
    onStep({ step: 'submit', phase: 'start' })
    await sleep(randInt(700, 1000))
    onStep({ step: 'submit', phase: 'done', detail: `tx ${shortHex(txHash)} · simulated` })

    onStep({ step: 'confirm', phase: 'start' })
    await sleep(randInt(1300, 1800))
    onStep({ step: 'confirm', phase: 'done', detail: `block #${fmtInt(estimatedHead() + 1)} · 1 confirmation` })

    const commitment = randHex(32)
    const leafIndex = networkSnapshot().anonymitySet + 1
    onStep({ step: 'prove', phase: 'start' })
    await sleep(randInt(1400, 1900))
    onStep({ step: 'prove', phase: 'done', detail: `commitment ${shortHex(commitment)} · leaf #${fmtInt(leafIndex)}` })

    onStep({ step: 'ready', phase: 'start' })
    await sleep(450)
    onStep({ step: 'ready', phase: 'done', detail: 'note encrypted · stored on this device' })

    return {
      noteId: randId('note', 8),
      commitment,
      leafIndex,
      amountEth,
      creditsEth: amountEth * (1 - PROTOCOL_FEE),
      txHash,
      simulated: true,
    }
  }

  async withdraw({ amountEth, to }: { amountEth: number; to: string }, onStep: OnStep): Promise<WithdrawReceipt> {
    const nullifier = randHex(32)
    onStep({ step: 'prove', phase: 'start' })
    await sleep(randInt(1300, 1700))
    onStep({ step: 'prove', phase: 'done', detail: `nullifier ${shortHex(nullifier)} · groth16` })

    const txHash = randHex(32)
    onStep({ step: 'relay', phase: 'start' })
    await sleep(randInt(1200, 1600))
    onStep({ step: 'relay', phase: 'done', detail: `relayer fee paid from note · tx ${shortHex(txHash)}` })

    onStep({ step: 'done', phase: 'start' })
    await sleep(400)
    onStep({ step: 'done', phase: 'done', detail: `${amountEth.toFixed(4)} ETH → ${shortHex(to, 5, 3)} · simulated` })
    return { nullifier, amountEth, to, txHash, simulated: true }
  }

  async authorize({ maxCostUsd }: { maxCostUsd: number }, onStep: OnStep): Promise<AccessProof> {
    const provingMs = randInt(340, 520)
    onStep({ step: 'prove', phase: 'start' })
    await sleep(provingMs + 420)
    const proofId = randHex(32)
    onStep({ step: 'prove', phase: 'done', detail: `π ${shortHex(proofId)} · groth16 · ${provingMs} ms` })

    const nullifier = randHex(32)
    onStep({ step: 'authorize', phase: 'start' })
    await sleep(randInt(380, 620))
    onStep({
      step: 'authorize',
      phase: 'done',
      detail: `nullifier ${shortHex(nullifier)} · cap $${maxCostUsd.toFixed(maxCostUsd < 0.01 ? 4 : 3)}`,
    })

    return {
      proofId,
      nullifier,
      root: randHex(32),
      epoch: Math.floor(Date.now() / 600_000),
      system: 'groth16/bn254',
      sizeBytes: 2_144,
      provingMs,
      maxCostUsd,
    }
  }

  async issueAgentCredential(
    { budgetEth, scope }: { name: string; budgetEth: number; scope: string[] },
    onStep: OnStep,
  ): Promise<AgentCredential> {
    const agentKey = randHex(20)
    onStep({ step: 'derive', phase: 'start' })
    await sleep(randInt(700, 950))
    onStep({ step: 'derive', phase: 'done', detail: `spend key ${shortHex(agentKey)} · ephemeral` })

    onStep({ step: 'allocate', phase: 'start' })
    await sleep(randInt(900, 1200))
    onStep({ step: 'allocate', phase: 'done', detail: `${budgetEth.toFixed(4)} ETH split into a fresh note` })

    onStep({ step: 'scope', phase: 'start' })
    await sleep(randInt(600, 800))
    onStep({ step: 'scope', phase: 'done', detail: `scope: ${scope.join(', ')}` })

    onStep({ step: 'online', phase: 'start' })
    await sleep(350)
    onStep({ step: 'online', phase: 'done', detail: 'no link to your wallet or balance' })
    return { agentKey, scope: scope.join(',') }
  }
}

import type { SearchHit } from './types'

/**
 * Canned outputs for the demo router. Matching is keyword-based; anything
 * unmatched gets an honest "simulated" answer instead of invented facts.
 */

interface Canned {
  match: RegExp
  text: string
}

const CHAT: Canned[] = [
  {
    match: /blob/i,
    text: `Think of every Ethereum block as a delivery truck with two compartments.

The regular compartment carries transactions and contract data. Anything stored there is kept by every node forever, so space is expensive.

Blobs, added in EIP-4844 ("proto-danksharding"), are a second compartment for bulk data, mostly batches posted by rollups. Each blob holds about 128 KB.

Two things make blobs cheap:
• They are temporary. Nodes keep them for roughly 18 days, which is long enough for anyone to verify the data, and then they can be pruned.
• They have their own fee market, so blob space doesn't compete with normal gas.

Smart contracts can't read a blob's contents directly. They only see a small commitment that proves what the blob contained.

The result: rollups publish their data to Ethereum for a fraction of the old cost, which is a big reason Layer 2 fees dropped. Later upgrades such as PeerDAS let nodes check blobs by sampling instead of downloading everything, so more blobs fit per block.`,
  },
  {
    match: /nullifier/i,
    text: `A nullifier is a one-time tag that proves you haven't spent something twice, without revealing which thing you spent.

When you deposit into a private pool you create a secret note. Its public fingerprint (a commitment) goes into a shared Merkle tree with everyone else's.

To spend, you publish two things:
• a zero-knowledge proof that you know the secret behind some commitment in the tree, and
• a nullifier derived from that same secret.

The verifier checks the proof and records the nullifier. If the same nullifier shows up again, the spend is rejected.

Because the nullifier can't be linked back to the commitment, observers learn that a valid note was spent, but not which one or who deposited it.`,
  },
  {
    match: /7702|smart account|account abstraction/i,
    text: `EIP-7702 lets a normal Ethereum account (an EOA) point to smart-contract code without moving to a new address.

The owner signs an authorization that says "run this contract's code for my account." From then on the account can do things that used to need a smart wallet:
• batch several actions into one transaction,
• let someone else pay the gas (sponsorship),
• use session keys with limited permissions.

The delegation stays in place until the owner changes or clears it, and the original private key still controls the account. It shipped in the Pectra upgrade in 2025.`,
  },
  {
    match: /zero.?knowledge|zk.?proof|snark|stark/i,
    text: `A zero-knowledge proof lets you convince someone a statement is true without showing them why.

Example: "I own a deposit in this pool that hasn't been spent yet." The verifier learns that the statement holds, and nothing else: not which deposit, not the amount, not the wallet that funded it.

Two properties make this useful for payments:
• Proofs are small and fast to check, even when the statement is complex.
• They can't be forged. A proof only exists if the prover really knows a valid secret.

NULL uses this to authorize API requests. Each call carries a proof that some funded balance can pay, in place of an API key or an account ID.`,
  },
  {
    match: /haiku|poem/i,
    text: `Paid without a name,
the request walks through the gate.
Only the proof stays.`,
  },
  {
    match: /rollup|layer ?2|l2/i,
    text: `A rollup executes transactions off Ethereum's main chain, then posts a compressed record of them back to Ethereum.

• Optimistic rollups assume batches are valid and allow a challenge window where anyone can prove fraud.
• ZK rollups attach a validity proof to every batch, so Ethereum verifies correctness directly.

Either way, Ethereum stays the source of truth for the data and the final state, while the rollup handles most of the work. That is how fees fall without giving up Ethereum's security.`,
  },
]

export function cannedChat(prompt: string, model: string): string {
  const hit = CHAT.find((c) => c.match.test(prompt))
  if (hit) return hit.text
  const topic = prompt.trim().replace(/\s+/g, ' ').slice(0, 80)
  return `This answer comes from the NULL demo router, not a live model, so it can't respond to "${topic}" in detail.

What did happen is the part NULL is about: your request reached ${model} carrying a zero-knowledge proof of payment. It carried no API key, no account and no wallet address, and it was billed to your private balance.

Point the router at a live zkAPI endpoint and the same flow returns real model output. Try one of the suggested prompts to see a full demo answer.`
}

export function cannedSearch(query: string): SearchHit[] {
  const q = query.trim() || 'private api payments'
  const enc = encodeURIComponent(q.toLowerCase()).slice(0, 48)
  return [
    {
      title: `${capitalise(q)}: overview and recent discussion`,
      url: `ethresear.ch/search?q=${enc}`,
      snippet: `Research threads touching on ${q.toLowerCase()}, including anonymous API credits, rate-limit nullifiers and refund tickets.`,
    },
    {
      title: 'Zero-knowledge proofs | ethereum.org',
      url: 'ethereum.org/en/zero-knowledge-proofs/',
      snippet: 'How zero-knowledge proofs let one party prove a statement is true without revealing the underlying data.',
    },
    {
      title: `EIPs related to "${shorten(q, 28)}"`,
      url: `eips.ethereum.org/all?q=${enc}`,
      snippet: 'Standards and proposals indexed by the Ethereum Improvement Proposals repository.',
    },
    {
      title: 'Privacy and the machine economy',
      url: 'null.network/research',
      snippet: 'Why autonomous agents need budgets that are separate from their operator’s identity.',
    },
  ]
}

export const RPC_METHODS = ['eth_blockNumber', 'eth_gasPrice', 'eth_chainId', 'eth_getBalance'] as const
export type RpcMethod = (typeof RPC_METHODS)[number]

/** Rough mainnet head estimate so the demo block number moves forward plausibly. */
export function estimatedHead(now = Date.now()): number {
  const refTs = Date.UTC(2026, 9, 1, 0, 0, 0)
  const refBlock = 26_071_300
  return refBlock + Math.floor((now - refTs) / 12_000)
}

export function cannedRpc(method: RpcMethod, param: string): string {
  switch (method) {
    case 'eth_blockNumber':
      return '0x' + estimatedHead().toString(16)
    case 'eth_gasPrice':
      return '0x' + Math.round(4.1e8 + Math.random() * 2.4e8).toString(16)
    case 'eth_chainId':
      return '0x1'
    case 'eth_getBalance': {
      // deterministic pseudo-balance from the address so repeats look consistent
      let h = 0
      for (const c of param.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0
      const wei = BigInt(h % 90_000) * 10n ** 14n + 12_345_678_901_234n
      return '0x' + wei.toString(16)
    }
  }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function shorten(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

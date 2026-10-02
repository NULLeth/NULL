# NULL — private access to the machine economy

One private balance. Every API. A V1 prototype site + working demo for a zkAPI-style
private payment layer: fund once from a wallet, then pay AI / RPC / data APIs (yourself or
through agents) with zero-knowledge proofs instead of accounts and API keys.

```bash
npm install
npm run dev        # http://localhost:5600
npm run build      # typecheck + production build into dist/
```

## What is real and what is simulated

| Works for real in the browser | Simulated (clearly labelled in the UI) |
| --- | --- |
| Navigation, modals, filters, responsive layout | Deposits / withdrawals: no transaction is broadcast |
| Wallet connect via EIP-6963 / `window.ethereum`, or demo wallet | Proof generation, nullifiers, Merkle leaves |
| Private balance, spend accounting, agent budgets | Service responses (canned answers, marked SIMULATED) |
| Agent heartbeat + live activity feed | Network stats (time-derived, footnoted) |
| State persisted in `localStorage` (`null.demo.v1`) | |

"RESET DEMO" in the dashboard sidebar restores the seeded state.

## Plugging in a real backend

The UI only talks to two interfaces in `src/protocol/types.ts`:

- `PrivateAccessClient`: `deposit`, `withdraw`, `authorize` (returns an `AccessProof`), `issueAgentCredential`
- `ServiceRouter`: `send(request, proof)`

The mock implementations are `src/protocol/mockClient.ts` and `src/protocol/mockRouter.ts`.
Implement both against the real zkAPI deployment, return them from `createBackend()` in
`src/protocol/index.ts`, and set `backend: 'zkapi'` in `src/config/project.ts`. The step
callbacks (`onStep`) drive the terminal progress UI, so emit the same step ids.

Brand copy, social links ([@NULL_zk](https://x.com/NULL_zk)) and the reference ETH/USD price
live in `src/config/project.ts`.

The real protocol is [zkAPI](https://blog.ethereum.org/2026/10/01/introducing-zkapi) by the
Ethereum Foundation and the Open Anonymity Project
([code](https://github.com/OpenAnonymity/zkapi)), live on mainnet since 2026-10-01.

## Layout

```
src/
  config/      project constants, links, chains
  protocol/    interfaces, service catalog, mock client + router, canned responses
  state/       store (reducer + persistence + agent heartbeat), UI state, intents
  components/  Button, Modal, Tooltip, ServiceCard, AgentCard, ActivityFeed,
               PrivacyIndicator, NetworkStat, NetworkCanvas, NullOrbit, …
  dashboard/   the in-page app: overview, services, agents, activity
  sections/    Nav, Hero, Architecture, Services, Agents, Stats, About, Footer
  modals/      connect, fund, withdraw, create agent, playground, docs
```

## Notes

- Honesty: the privacy report and the architecture section state that NULL hides *who pays*,
  not *what you ask*. Request content stays visible to the provider.
- Motion: slow informational loops (session trace, packets, feeds) always run; large
  entrance motion and smooth scrolling follow `prefers-reduced-motion`.

import { RELAYS } from '../lib/network'
import { hashString, pick, randId, randInt, sleep } from '../lib/random'
import { serviceById } from './catalog'
import { cannedChat, cannedRpc, cannedSearch, RPC_METHODS, type RpcMethod } from './responses'
import type { AccessProof, OnStep, ServiceRequest, ServiceResponse, ServiceResult, ServiceRouter } from './types'

const MODEL_LABEL: Record<string, string> = {
  claude: 'anthropic/claude',
  gpt: 'openai/gpt',
  openrouter: 'openrouter/auto',
}

/** Simulated router: proof in, canned (clearly labelled) result out. */
export class MockServiceRouter implements ServiceRouter {
  async send(req: ServiceRequest, _proof: AccessProof, onStep: OnStep): Promise<ServiceResponse> {
    const svc = serviceById(req.serviceId)
    const relay = pick(RELAYS)

    onStep({ step: 'route', phase: 'start' })
    await sleep(randInt(520, 760))
    onStep({ step: 'route', phase: 'done', detail: `relay hop 2/2 · exit ${relay}` })

    onStep({ step: 'done', phase: 'start' })
    const latency = Math.round(svc.latencyMs * (0.75 + Math.random() * 0.6))
    await sleep(Math.min(latency, 2600))

    let result: ServiceResult
    switch (svc.kind) {
      case 'chat': {
        const model = MODEL_LABEL[svc.id] ?? svc.route
        const text = cannedChat(req.input, model)
        result = { kind: 'chat', text, model, tokens: Math.round(text.split(/\s+/).length * 1.35) }
        break
      }
      case 'rpc': {
        const method = (RPC_METHODS as readonly string[]).includes(req.input) ? (req.input as RpcMethod) : 'eth_blockNumber'
        result = { kind: 'rpc', method, result: cannedRpc(method, req.params?.address ?? '') }
        break
      }
      case 'search':
        result = { kind: 'search', hits: cannedSearch(req.input) }
        break
      case 'image':
        result = { kind: 'image', seed: hashString(req.input + Date.now()), prompt: req.input }
        break
    }

    onStep({ step: 'done', phase: 'done', detail: `200 OK · ${(latency / 1000).toFixed(2)} s` })
    return {
      requestId: randId('req', 12),
      status: 200,
      latencyMs: latency,
      costUsd: svc.priceUsd,
      relay,
      result,
    }
  }
}

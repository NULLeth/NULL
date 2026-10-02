import { CHAINS } from '../config/project'

/** Minimal EIP-1193 surface we need. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
  on?(event: string, handler: (...args: unknown[]) => void): void
  removeListener?(event: string, handler: (...args: unknown[]) => void): void
}

export interface DiscoveredWallet {
  uuid: string
  name: string
  icon: string
  rdns: string
  provider: Eip1193Provider
}

export interface WalletInfo {
  address: string
  kind: 'demo' | 'injected'
  label: string
  chainId: number
  rdns?: string
  icon?: string
}

export const DEMO_ADDRESS = '0x71F3A9c4E2b8D06f5A1c7e93B4d0F2a8C6E1992A'

export function demoWallet(): WalletInfo {
  return { address: DEMO_ADDRESS, kind: 'demo', label: 'Demo wallet', chainId: 1 }
}

export function chainName(id: number): string {
  return CHAINS[id] ?? `Chain ${id}`
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { isMetaMask?: boolean; isRabby?: boolean }
  }
  interface WindowEventMap {
    'eip6963:announceProvider': CustomEvent<{ info: Omit<DiscoveredWallet, 'provider'>; provider: Eip1193Provider }>
  }
}

/**
 * EIP-6963 multi-wallet discovery with a window.ethereum fallback.
 * Calls `onChange` with the current list whenever a wallet announces itself.
 */
export function discoverWallets(onChange: (list: DiscoveredWallet[]) => void): () => void {
  const found = new Map<string, DiscoveredWallet>()
  const emit = () => onChange([...found.values()])

  const onAnnounce = (e: WindowEventMap['eip6963:announceProvider']) => {
    const { info, provider } = e.detail
    if (!info?.uuid || found.has(info.rdns)) return
    found.set(info.rdns, { ...info, provider })
    emit()
  }
  window.addEventListener('eip6963:announceProvider', onAnnounce)
  window.dispatchEvent(new Event('eip6963:requestProvider'))

  // Legacy injected wallet that doesn't speak 6963.
  const fallback = setTimeout(() => {
    if (found.size === 0 && window.ethereum) {
      const eth = window.ethereum
      const name = eth.isRabby ? 'Rabby' : eth.isMetaMask ? 'MetaMask' : 'Browser wallet'
      found.set('injected', { uuid: 'injected', name, icon: '', rdns: 'injected', provider: eth })
      emit()
    }
  }, 350)

  return () => {
    clearTimeout(fallback)
    window.removeEventListener('eip6963:announceProvider', onAnnounce)
  }
}

export async function connectInjected(w: DiscoveredWallet): Promise<WalletInfo> {
  const accounts = (await w.provider.request({ method: 'eth_requestAccounts' })) as string[]
  if (!accounts?.length) throw new Error('No account was shared by the wallet.')
  const chainHex = (await w.provider.request({ method: 'eth_chainId' })) as string
  activeProvider = w.provider
  return {
    address: accounts[0],
    kind: 'injected',
    label: w.name,
    chainId: parseInt(chainHex, 16) || 1,
    rdns: w.rdns,
    icon: w.icon || undefined,
  }
}

/** The provider of the currently connected injected wallet (not persisted). */
let activeProvider: Eip1193Provider | null = null
export function getActiveProvider() {
  return activeProvider
}

/** Re-attach to a previously connected wallet without prompting. */
export async function silentReconnect(w: DiscoveredWallet): Promise<WalletInfo | null> {
  try {
    const accounts = (await w.provider.request({ method: 'eth_accounts' })) as string[]
    if (!accounts?.length) return null
    const chainHex = (await w.provider.request({ method: 'eth_chainId' })) as string
    activeProvider = w.provider
    return {
      address: accounts[0],
      kind: 'injected',
      label: w.name,
      chainId: parseInt(chainHex, 16) || 1,
      rdns: w.rdns,
      icon: w.icon || undefined,
    }
  } catch {
    return null
  }
}

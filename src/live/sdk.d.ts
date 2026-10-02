/** The subset of @openanonymity/zkapi-browser-sdk (plain JS) that NULL uses. */
declare module '@openanonymity/zkapi-browser-sdk' {
  export interface ZkNoteStatus {
    note_id: number
    deposit_amount: number
    current_balance: number
    expiry_ts: number
  }
  export interface ZkWalletStatus {
    has_note: boolean
    pending_request: boolean
    note: ZkNoteStatus | null
  }
  export interface ZkActivity {
    id: string
    kind: string
    phase: string
    title?: string
    message?: string
  }
  export interface ZkPendingDeposit {
    phase: string
    /** gwei */
    amount: number
    transaction_hash: string | null
  }
  export interface ZkSnapshot {
    config: { pending_deposit?: ZkPendingDeposit | null } | null
    wallet: ZkWalletStatus | null
    walletAddress: string | null
    withdrawal: { phase?: string; mode?: string; destination?: string; transactionHash?: string | null } | null
    deposits: { transactionHash?: string; amount?: number | string; feeWei?: string }[]
    loading: boolean
    lastError: { message?: string } | string | null
    initialized: boolean
    activities: ZkActivity[]
  }
  export interface ZkPriceQuote {
    answer: string
    decimals: number
    updated_at: number
  }
  export interface ZkAccess {
    mode: 'ephemeral-key'
    apiKey: string
    baseUrl: string
    spendingLimitUsd: number
    headers: Record<string, string>
    release: () => void
  }
  export interface ZkProgress {
    kind: string
    phase: string
    message: string
  }
  export interface ZkClient {
    init(): Promise<unknown>
    subscribe(listener: (snapshot: ZkSnapshot) => void): () => void
    snapshot(): ZkSnapshot
    refresh(opts?: { quiet?: boolean }): Promise<void>
    setWalletProvider(provider: unknown): void
    readonly hasNote: boolean
    readonly note: ZkNoteStatus | null
    readonly nativePriceQuote: ZkPriceQuote | null
    refreshEthUsdPrice(opts?: { signal?: AbortSignal }): Promise<ZkPriceQuote>
    deposit(ethAmount: string, onStatus?: (message: string) => void): Promise<unknown>
    /** Finishes a deposit whose transaction landed but was never confirmed in this browser. */
    recoverBrowserDeposit(onStatus?: (message: string) => void): Promise<unknown>
    withdraw(mode: 'mutual' | 'escape', onStatus?: (message: string) => void, opts?: { destination?: string }): Promise<unknown>
    acquireInferenceAccess(sessionId: string, opts?: { signal?: AbortSignal; spendingLimitUsd?: number; onProgress?: (p: ZkProgress) => void }): Promise<ZkAccess>
    settleActiveLease(onStatus?: (message: string) => void, opts?: { sessionId?: string | null }): Promise<unknown>
  }
  export function configureBrowserSdk(opts: { configUrl: string; workerUrl: string; transport?: unknown }): void
  export const zkapiClient: ZkClient
  export const CHAT_SPENDING_TIER_USD: readonly number[]
}

import { ArrowUpRight, Flame } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { LogoMark } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { PROJECT } from '../config/project'
import { connectInjected, discoverWallets, type DiscoveredWallet, type Eip1193Provider } from '../lib/wallet'
import { claimableWeth, SEL, tokenBalance, uintWord, word } from './chain'

/**
 * /burn — the creator's buyback tool (not linked, noindex). Three steps, each one a
 * normal transaction the creator signs in their own wallet: claim the fees from
 * Stockpad's escrow, buy $NULL with them, send the bought $NULL to the dead address.
 * The page never moves funds by itself.
 */

const { ca, ticker } = PROJECT.token
const { creator, escrow, dead, weth } = PROJECT.burn
const ETHERSCAN = 'https://etherscan.io'
const BUY_URL = `https://app.uniswap.org/swap?chain=ethereum&inputCurrency=${weth}&outputCurrency=${ca}`

const fmt = (wei: bigint, digits = 4) => (Number(wei / 10n ** 10n) / 1e8).toLocaleString('en-US', { maximumFractionDigits: digits })

/** "1,234.5" → wei (18 decimals); null when it isn't a positive number */
function parseAmount(s: string): bigint | null {
  const clean = s.replace(/[,\s_]/g, '')
  if (!/^\d+(\.\d{0,18})?$/.test(clean)) return null
  const [whole, frac = ''] = clean.split('.')
  const wei = BigInt(whole) * 10n ** 18n + BigInt((frac + '0'.repeat(18)).slice(0, 18))
  return wei > 0n ? wei : null
}

type Tx = { label: string; hash: string; status: 'pending' | 'done' | 'failed' }

export default function BurnPage() {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [provider, setProvider] = useState<Eip1193Provider | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [fees, setFees] = useState<bigint | null>(null)
  const [nullBal, setNullBal] = useState<bigint | null>(null)
  const [wethBal, setWethBal] = useState<bigint | null>(null)
  const [amount, setAmount] = useState('')
  const [sure, setSure] = useState(false)
  const [txs, setTxs] = useState<Tx[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'NULL · buyback & burn'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return discoverWallets(setWallets)
  }, [])

  const refresh = useCallback(async () => {
    try {
      setFees(await claimableWeth(account ?? creator))
      if (account) {
        setNullBal(await tokenBalance(ca, account))
        setWethBal(await tokenBalance(weth, account))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [account])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const connect = async (w: DiscoveredWallet) => {
    setError('')
    try {
      const info = await connectInjected(w)
      setProvider(w.provider)
      setAccount(info.address)
      setChainId(info.chainId)
      w.provider.on?.('accountsChanged', (a) => setAccount((a as string[])[0] ?? null))
      w.provider.on?.('chainChanged', (c) => setChainId(parseInt(c as string, 16)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const send = async (label: string, to: string, data: string) => {
    if (!provider || !account) return
    setError('')
    try {
      const hash = (await provider.request({ method: 'eth_sendTransaction', params: [{ from: account, to, data }] })) as string
      setTxs((t) => [{ label, hash, status: 'pending' }, ...t])
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 4000))
        const rc = (await provider.request({ method: 'eth_getTransactionReceipt', params: [hash] })) as { status?: string } | null
        if (rc?.status) {
          setTxs((t) => t.map((x) => (x.hash === hash ? { ...x, status: rc.status === '0x1' ? 'done' : 'failed' } : x)))
          break
        }
      }
      void refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const isCreator = !!account && account.toLowerCase() === creator.toLowerCase()
  const wrongChain = chainId != null && chainId !== 1
  const burnWei = parseAmount(amount)
  const tooMuch = burnWei != null && nullBal != null && burnWei > nullBal

  return (
    <div className="min-h-[100dvh] bg-bg px-4 py-10 text-fg sm:px-6">
      <div className="mx-auto max-w-[720px]">
        <a href="/" className="inline-flex items-center gap-2 text-fg">
          <LogoMark className="size-5" />
          <span className="font-mono text-[13px] font-semibold tracking-[0.26em]">NULL</span>
          <span className="font-mono text-[11px] tracking-[0.14em] text-dim">BUYBACK &amp; BURN</span>
        </a>
        <h1 className="mt-8 text-[28px] font-medium tracking-[-0.02em]">Buy back and burn {ticker}</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
          Manual fallback for the buyback bot. Three steps, each one a normal transaction you sign in your wallet. Nothing happens without your signature,
          and burns can never be undone. The commitment is {PROJECT.burn.burnShare * 100}% of the claimed fees.
        </p>

        {/* wallet */}
        <div className="mt-8 rounded-lg border border-line-2 px-5 py-4">
          {account ? (
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[12px]">
              <span className="text-soft">
                {account.slice(0, 8)}…{account.slice(-6)} {isCreator ? <span className="text-ok">· creator wallet ✓</span> : <span className="text-warn">· not the creator wallet</span>}
              </span>
              {wrongChain && (
                <Button size="sm" variant="secondary" onClick={() => void provider?.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] })}>
                  Switch to Ethereum
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13.5px] text-muted">Connect the creator wallet</span>
              {wallets.map((w) => (
                <Button key={w.uuid} size="sm" variant="secondary" onClick={() => void connect(w)}>
                  {w.name}
                </Button>
              ))}
              {!wallets.length && <span className="font-mono text-[11px] text-dim">no browser wallet found</span>}
            </div>
          )}
          <p className="mt-2 font-mono text-[10.5px] text-dim">
            creator {creator} · fees can only be claimed by this wallet
          </p>
        </div>

        {/* 1 claim */}
        <div className="mt-4 rounded-lg border border-line-2 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-dim">01</span>
            <h2 className="text-[15px] font-medium">Claim the trading fees</h2>
          </div>
          <p className="mt-2 text-[13.5px] text-muted">
            Waiting in {PROJECT.burn.launchpad}&apos;s escrow: <span className="text-fg">{fees == null ? '…' : `${fmt(fees, 5)} WETH`}</span>
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="primary"
              disabled={!isCreator || wrongChain || !fees}
              onClick={() => void send('Claim fees', escrow, SEL.claim + word(weth) + word(account!))}
            >
              Claim to this wallet
            </Button>
          </div>
        </div>

        {/* 2 buy */}
        <div className="mt-4 rounded-lg border border-line-2 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-dim">02</span>
            <h2 className="text-[15px] font-medium">Buy {ticker} with it</h2>
          </div>
          <p className="mt-2 text-[13.5px] text-muted">
            WETH in this wallet: <span className="text-fg">{wethBal == null ? '—' : `${fmt(wethBal, 5)} WETH`}</span>. Swap {PROJECT.burn.burnShare * 100}% of what you claimed for {ticker}, on Uniswap or on
            the {ticker} page on {PROJECT.burn.launchpad}.
          </p>
          <a href={BUY_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.12em] text-soft hover:text-fg">
            OPEN UNISWAP (WETH → {ticker}) <ArrowUpRight className="size-3" />
          </a>
        </div>

        {/* 3 burn */}
        <div className="mt-4 rounded-lg border border-warn/30 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-dim">03</span>
            <h2 className="text-[15px] font-medium">Burn what you bought</h2>
          </div>
          <p className="mt-2 text-[13.5px] text-muted">
            {ticker} in this wallet: <span className="text-fg">{nullBal == null ? '—' : fmt(nullBal, 2)}</span>. Enter exactly the amount the buyback bought, not
            the whole balance if this wallet holds other {ticker}.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setSure(false)
              }}
              inputMode="decimal"
              placeholder={`amount of ${ticker}`}
              className="h-9 w-56 rounded-md border border-line-2 bg-panel px-3 font-mono text-[13px] text-fg outline-none placeholder:text-faint focus:border-line-3"
            />
            {tooMuch && <span className="font-mono text-[11px] text-bad">more than this wallet holds</span>}
          </div>
          <label className="mt-3 flex items-start gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1" />
            <span>
              Send {burnWei ? fmt(burnWei, 2) : '…'} {ticker} to the dead address {dead.slice(0, 8)}…{dead.slice(-4)}. I understand this can never be undone.
            </span>
          </label>
          <div className="mt-3">
            <Button
              size="sm"
              variant="primary"
              disabled={!account || wrongChain || !burnWei || tooMuch || !sure}
              onClick={() => burnWei && void send(`Burn ${fmt(burnWei, 2)} ${ticker}`, ca, SEL.transfer + word(dead) + uintWord(burnWei))}
              icon={<Flame className="size-3.5" />}
            >
              Burn
            </Button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-md border border-bad/25 bg-bad/[0.05] px-4 py-3 text-[13px] text-bad/90">{error}</p>}

        {!!txs.length && (
          <div className="mt-4 rounded-lg border border-line-2">
            {txs.map((t) => (
              <a
                key={t.hash}
                href={`${ETHERSCAN}/tx/${t.hash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 font-mono text-[12px] first:border-t-0 hover:bg-white/[0.02]"
              >
                <span className="text-soft">{t.label}</span>
                <span className={t.status === 'done' ? 'text-ok' : t.status === 'failed' ? 'text-bad' : 'text-muted'}>
                  {t.status === 'pending' ? 'pending…' : t.status} · {t.hash.slice(0, 10)}… <ArrowUpRight className="inline size-3" />
                </span>
              </a>
            ))}
          </div>
        )}

        <p className="mt-8 font-mono text-[10.5px] leading-relaxed text-dim">
          Burns sent from the creator wallet show up on nullzk.com in the Buyback &amp; Burn section within a minute.
        </p>
      </div>
    </div>
  )
}

import { ArrowUpRight, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CopyAddress } from '../../components/ui/CopyAddress'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { StatusLog, useStatusLog } from '../../components/ui/StatusLog'
import { LIVE } from '../../config/mode'
import { fmtEth, fmtUsd, shortAddr } from '../../lib/format'
import { getActiveProvider } from '../../lib/wallet'
import { errorMessage, readGasPriceGwei } from '../../live/client'
import { useLive } from '../../live/LiveProvider'
import { useAccount } from '../../live/useAccount'
import { useUi } from '../../state/ui'
import { AmountPicker, DemoNotice, FieldLabel, parseAmount, SuccessMark, Summary } from '../parts'

/** ETH amount → the SDK's decimal string (max 9 decimals, the vault's gwei ledger). */
const toEthString = (v: number) => v.toFixed(9).replace(/0+$/, '').replace(/\.$/, '')

function expiryDate(fromNow = Date.now()) {
  const day = 86_400_000
  const ts = Math.ceil((fromNow + LIVE.noteTtlDays * day) / day) * day
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function LiveFundModal({ open }: { open: boolean }) {
  const live = useLive()
  const account = useAccount()
  const ui = useUi()
  const [preset, setPreset] = useState<number | null>(LIVE.depositPresetsEth[1])
  const [custom, setCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [ack, setAck] = useState(false)
  const [phase, setPhase] = useState<'form' | 'running' | 'done' | 'error'>('form')
  const [gasGwei, setGasGwei] = useState<number | null>(null)
  const log = useStatusLog()

  useEffect(() => {
    if (open) {
      setPhase('form')
      setAck(false)
      log.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Deposits cost a fixed ~6.7M gas, so show the fee before anyone signs.
  useEffect(() => {
    if (!open) return
    let alive = true
    const load = () =>
      readGasPriceGwei()
        .then((g) => alive && setGasGwei(g))
        .catch(() => {})
    load()
    const t = setInterval(load, 15_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [open])

  const amount = custom ? parseAmount(customValue) : (preset ?? 0)
  const valid = Number.isFinite(amount) && amount >= 0.001 && amount <= LIVE.depositCapEth
  const usd = (eth: number) => (live?.ethUsd ? fmtUsd(eth * live.ethUsd, { cents: true }) : '—')
  const wallet = account.wallet
  const feeEth = gasGwei != null ? (LIVE.depositGas * gasGwei) / 1e9 : null
  const exitFeeEth = gasGwei != null ? (LIVE.withdrawGas * gasGwei) / 1e9 : null
  const feeShare = feeEth != null && exitFeeEth != null && valid ? (feeEth + exitFeeEth) / amount : 0
  const feeHigh = feeShare > LIVE.feeWarnShare

  const submit = async () => {
    if (!live || !wallet || !valid || !ack) return
    setPhase('running')
    log.reset()
    try {
      const client = await live.client()
      client.setWalletProvider(getActiveProvider())
      await client.deposit(toEthString(amount), log.push)
      log.finish(true, 'Private balance ready.')
      live.addLog({ kind: 'deposit', actor: 'YOU', amountEth: amount, detail: 'note created · Ethereum mainnet' })
      await live.refresh()
      setPhase('done')
    } catch (err) {
      log.finish(false, errorMessage(err))
      setPhase('error')
    }
  }

  let body
  if (!live || live.status === 'loading') {
    body = (
      <div className="flex items-center gap-3 px-6 py-10 font-mono text-[12.5px] text-muted">
        <Spinner className="size-4" /> Connecting to zkAPI on Ethereum mainnet…
      </div>
    )
  } else if (live.status === 'error') {
    body = (
      <div className="px-6 py-8 text-[13.5px] text-bad/90">
        zkAPI could not start: {live.error}
        <div className="mt-4">
          <Button variant="secondary" onClick={() => location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  } else if (live.hasNote && phase === 'form') {
    body = (
      <div className="space-y-4 px-5 pb-5 pt-5 sm:px-6">
        <p className="text-[14px] leading-relaxed text-muted">
          You already have a private balance of <span className="font-mono text-fg">{fmtEth(live.balanceEth, 6)} ETH</span>. zkAPI keeps one balance per
          browser, so it can&apos;t be topped up. Close it and withdraw the rest, then fund a new one.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={ui.close}>
            Keep it
          </Button>
          <Button variant="primary" onClick={() => ui.open({ name: 'withdraw' })}>
            Withdraw
          </Button>
        </div>
      </div>
    )
  } else if (!wallet && phase === 'form') {
    body = (
      <div className="space-y-4 px-5 pb-5 pt-5 sm:px-6">
        <p className="text-[14px] leading-relaxed text-muted">Connect a browser wallet (MetaMask, Rabby…) on Ethereum mainnet to fund a private balance.</p>
        <Button variant="primary" block onClick={() => ui.open({ name: 'connect', then: 'fund' })}>
          Connect wallet
        </Button>
      </div>
    )
  } else if (phase === 'form') {
    body = (
      <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6">
        <div>
          <FieldLabel hint={valid ? `≈ ${usd(amount)}` : custom && customValue ? `0.001 – ${LIVE.depositCapEth} ETH` : undefined}>AMOUNT</FieldLabel>
          <AmountPicker
            presets={[...LIVE.depositPresetsEth]}
            value={preset}
            custom={custom}
            onPreset={(v) => {
              setPreset(v)
              setCustom(false)
            }}
            onCustom={() => setCustom(true)}
            customValue={customValue}
            onCustomValue={setCustomValue}
          />
        </div>
        <Summary
          rows={[
            ['WALLET', wallet ? <CopyAddress value={wallet.address} /> : '—'],
            ['DEPOSIT', valid ? `${fmtEth(amount, 4)} ETH` : '—'],
            [
              'NETWORK FEE (EST.)',
              feeEth != null ? (
                <span className={feeHigh ? 'text-warn' : ''}>
                  ≈ {fmtEth(feeEth, 4)} ETH · {usd(feeEth)} <span className="text-dim">@ {gasGwei!.toFixed(2)} gwei</span>
                </span>
              ) : (
                'checking gas…'
              ),
            ],
            ['WITHDRAW LATER (EST.)', exitFeeEth != null ? `≈ ${fmtEth(exitFeeEth, 4)} ETH · ${usd(exitFeeEth)}` : '—'],
            ['PRIVATE BALANCE', valid ? <span className="text-fg">{fmtEth(amount, 4)} ETH</span> : '—'],
            ['NETWORK', LIVE.network],
            [
              'VAULT',
              <a
                href={`https://etherscan.io/address/${LIVE.vault}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-soft underline decoration-line-3 underline-offset-2 hover:text-fg"
              >
                {shortAddr(LIVE.vault, 6, 4)} <ArrowUpRight className="size-3" />
              </a>,
            ],
            ['CLOSE BEFORE', expiryDate()],
          ]}
        />
        {feeHigh && (
          <div className="rounded-md border border-warn/25 bg-warn/[0.05] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warn/90">
            Gas makes up about {Math.round(feeShare * 100)}% of this deposit (paying in and out). zkAPI deposits and withdrawals each use ~7M gas, whatever
            the amount, so wait for low gas (under ~0.5 gwei) or deposit more at once. In MetaMask, pick the &quot;Market&quot; or &quot;Low&quot; fee
            instead of &quot;Aggressive&quot;.
          </div>
        )}
        <button
          type="button"
          role="checkbox"
          aria-checked={ack}
          onClick={() => setAck((a) => !a)}
          className={`flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors ${ack ? 'border-line-3 bg-white/[0.03]' : 'border-line-2 hover:border-line-3'}`}
        >
          <span className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${ack ? 'border-fg bg-fg text-bg' : 'border-line-3'}`}>
            {ack && <Check className="size-3" strokeWidth={3} />}
          </span>
          <span className="text-[12.5px] leading-relaxed text-muted">
            I understand zkAPI is <span className="text-soft">experimental and unaudited</span>, my private balance lives{' '}
            <span className="text-soft">in this browser</span>, and anything not withdrawn within {LIVE.noteTtlDays} days can be claimed by the operator (
            {LIVE.operator}).
          </span>
        </button>
        <DemoNotice>
          This is real ETH on Ethereum mainnet. NULL is a front-end; deposits go into the zkAPI vault run by {LIVE.operator}, never to NULL.
        </DemoNotice>
        <Button variant="primary" size="lg" block onClick={submit} disabled={!valid || !ack}>
          Create private balance
        </Button>
      </div>
    )
  } else {
    body = (
      <div className="px-5 pb-5 pt-4 sm:px-6">
        <StatusLog lines={log.lines} />
        {phase === 'done' && (
          <div className="mt-5">
            <div className="flex items-center gap-4">
              <SuccessMark />
              <p className="flex-1 text-[13px] leading-relaxed text-muted">
                Your private balance is ready. Requests are now paid with proofs, and your wallet doesn&apos;t appear in any of them.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => ui.open({ name: 'playground', serviceId: 'claude' })}>
                Try a request
              </Button>
              <Button variant="primary" onClick={ui.close}>
                Done
              </Button>
            </div>
          </div>
        )}
        {phase === 'error' && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={ui.close}>
              Close
            </Button>
            <Button variant="primary" onClick={() => setPhase('form')}>
              Back
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal open={open} onClose={ui.close} locked={phase === 'running'} eyebrow="FUND · MAINNET" title={phase === 'done' ? 'Private balance ready' : 'Create a private balance'}>
      {body}
    </Modal>
  )
}

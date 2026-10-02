import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { TerminalSteps, useSteps, type StepDef } from '../components/ui/TerminalSteps'
import { ethToUsd, fmtEth, fmtUsd, shortAddr } from '../lib/format'
import { randHex } from '../lib/random'
import { backend } from '../protocol'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { DemoNotice, FieldLabel, parseAmount, SuccessMark, Summary } from './parts'

const STEPS: StepDef[] = [
  { id: 'prove', label: 'Generating withdrawal proof...' },
  { id: 'relay', label: 'Relaying to Ethereum...' },
  { id: 'done', label: 'Funds released.' },
]

const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim())

export function WithdrawModal({ open }: { open: boolean }) {
  const { state, applyWithdraw } = useNull()
  const ui = useUi()
  const [amountStr, setAmountStr] = useState('')
  const [dest, setDest] = useState<'wallet' | 'fresh'>('fresh')
  const [fresh, setFresh] = useState('')
  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form')
  const steps = useSteps(STEPS)

  const max = Math.floor(state.balanceEth * 10_000) / 10_000

  useEffect(() => {
    if (open) {
      setPhase('form')
      setAmountStr(max > 0 ? Math.min(0.05, max).toFixed(4) : '')
      steps.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const amount = parseAmount(amountStr)
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= max + 1e-9
  const to = dest === 'wallet' ? state.wallet?.address ?? '' : fresh.trim()
  const validTo = isAddress(to)
  const ok = validAmount && validTo

  const submit = async () => {
    if (!ok) return
    setPhase('running')
    const r = await backend.access.withdraw({ amountEth: amount, to }, steps.onStep)
    applyWithdraw(r.amountEth, r.to, r.nullifier)
    setPhase('done')
  }

  const radio = (on: boolean) =>
    `flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors ${on ? 'border-fg/60 bg-white/[0.04]' : 'border-line-2 hover:border-line-3'}`

  return (
    <Modal open={open} onClose={ui.close} locked={phase === 'running'} eyebrow="WITHDRAW" title={phase === 'done' ? 'Withdrawal sent' : 'Withdraw from private balance'}>
      {phase === 'form' && (
        <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6">
          <div>
            <FieldLabel hint={`available ${fmtEth(max)} ETH`}>AMOUNT</FieldLabel>
            <div className="flex h-12 items-center gap-2 rounded-md border border-line-2 bg-white/[0.015] px-4 focus-within:border-line-3">
              <input
                data-autofocus
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
                className="min-w-0 flex-1 bg-transparent font-mono text-[18px] text-fg outline-none tnum"
                aria-label="Amount in ETH"
                placeholder="0.00"
              />
              {[0.25, 0.5, 1].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAmountStr((Math.floor(max * f * 10_000) / 10_000).toFixed(4))}
                  className="rounded-[4px] border border-line-2 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-muted transition-colors hover:border-line-3 hover:text-fg"
                >
                  {f === 1 ? 'MAX' : `${f * 100}%`}
                </button>
              ))}
            </div>
            {amountStr && !validAmount && <p className="mt-1.5 font-mono text-[11px] text-bad">Enter an amount up to {fmtEth(max)} ETH.</p>}
          </div>

          <div>
            <FieldLabel>DESTINATION</FieldLabel>
            <div className="space-y-2">
              <button type="button" className={radio(dest === 'fresh')} onClick={() => setDest('fresh')}>
                <span className={`mt-1 size-3 shrink-0 rounded-full border ${dest === 'fresh' ? 'border-fg bg-fg shadow-[inset_0_0_0_2px_var(--color-panel)]' : 'border-line-3'}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13.5px] text-fg">
                    Fresh address <span className="font-mono text-[9.5px] tracking-[0.12em] text-ok">MOST PRIVATE</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-dim">An address that has never touched the funding wallet.</span>
                </span>
              </button>
              {dest === 'fresh' && (
                <div className="flex gap-2 pl-[38px]">
                  <input
                    value={fresh}
                    onChange={(e) => setFresh(e.target.value)}
                    placeholder="0x…"
                    spellCheck={false}
                    className="h-10 min-w-0 flex-1 rounded-md border border-line-2 bg-bg px-3 font-mono text-[12.5px] text-fg outline-none focus:border-line-3"
                    aria-label="Fresh destination address"
                  />
                  <Button size="sm" variant="secondary" className="!h-10" onClick={() => setFresh(randHex(20))}>
                    Generate
                  </Button>
                </div>
              )}
              <button type="button" className={radio(dest === 'wallet')} onClick={() => setDest('wallet')} disabled={!state.wallet}>
                <span className={`mt-1 size-3 shrink-0 rounded-full border ${dest === 'wallet' ? 'border-fg bg-fg shadow-[inset_0_0_0_2px_var(--color-panel)]' : 'border-line-3'}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13.5px] text-fg">
                    Connected wallet {state.wallet && <span className="font-mono text-[11.5px] text-muted">{shortAddr(state.wallet.address)}</span>}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-warn/80">Links this withdrawal to the wallet that funded the balance.</span>
                </span>
              </button>
            </div>
            {dest === 'fresh' && fresh && !validTo && <p className="mt-1.5 font-mono text-[11px] text-bad">That doesn&apos;t look like an Ethereum address.</p>}
          </div>

          <Summary
            rows={[
              ['WITHDRAW', validAmount ? `${fmtEth(amount)} ETH` : '—'],
              ['APPROX.', validAmount ? fmtUsd(ethToUsd(amount), { cents: true }) : '—'],
              ['RELAYER', 'paid from the note'],
            ]}
          />
          <DemoNotice>Demo mode: the withdrawal is simulated and no funds move.</DemoNotice>
          <Button variant="primary" size="lg" block onClick={submit} disabled={!ok}>
            Withdraw privately
          </Button>
        </div>
      )}
      {phase !== 'form' && (
        <div className="px-5 pb-5 pt-4 sm:px-6">
          <div className="rounded-md border border-line bg-[#08080a] px-4 py-2">
            <TerminalSteps defs={STEPS} state={steps.state} />
          </div>
          {phase === 'done' && (
            <div className="mt-5 flex items-center gap-4">
              <SuccessMark />
              <p className="flex-1 text-[13px] leading-relaxed text-muted">
                {fmtEth(amount)} ETH released to <span className="font-mono text-soft">{to.slice(0, 6)}…{to.slice(-4)}</span>. The proof shows a valid note was spent, not which one.
              </p>
              <Button variant="primary" onClick={ui.close}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

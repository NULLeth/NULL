import { useEffect, useState } from 'react'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Button } from '../components/ui/Button'
import { CopyAddress } from '../components/ui/CopyAddress'
import { Modal } from '../components/ui/Modal'
import { TerminalSteps, useSteps, type StepDef } from '../components/ui/TerminalSteps'
import { ethToUsd, fmtEth, fmtUsd } from '../lib/format'
import { chainName } from '../lib/wallet'
import { backend, PROTOCOL_FEE, type DepositReceipt } from '../protocol'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { AmountPicker, DemoNotice, FieldLabel, parseAmount, SuccessMark, Summary } from './parts'

const STEPS: StepDef[] = [
  { id: 'submit', label: 'Submitting deposit...' },
  { id: 'confirm', label: 'Waiting for confirmation...' },
  { id: 'prove', label: 'Generating zero-knowledge note...' },
  { id: 'ready', label: 'Private balance ready.' },
]

export function FundModal({ open }: { open: boolean }) {
  const { state, applyDeposit } = useNull()
  const ui = useUi()
  const [preset, setPreset] = useState<number | null>(0.1)
  const [custom, setCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form')
  const [receipt, setReceipt] = useState<DepositReceipt | null>(null)
  const [display, setDisplay] = useState(0)
  const steps = useSteps(STEPS)

  useEffect(() => {
    if (open) {
      setPhase('form')
      setReceipt(null)
      steps.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const amount = custom ? parseAmount(customValue) : (preset ?? 0)
  const valid = Number.isFinite(amount) && amount >= 0.001 && amount <= 100
  const credits = valid ? amount * (1 - PROTOCOL_FEE) : 0
  const wallet = state.wallet
  const hasBalance = state.balanceEth > 0 || state.notes.length > 0

  const submit = async () => {
    if (!wallet || !valid) return
    setPhase('running')
    const start = state.balanceEth
    setDisplay(start)
    const r = await backend.access.deposit({ amountEth: amount, from: wallet.address }, steps.onStep)
    setReceipt(r)
    applyDeposit(r)
    setPhase('done')
    setTimeout(() => setDisplay(start + r.creditsEth), 180)
  }

  return (
    <Modal
      open={open}
      onClose={ui.close}
      locked={phase === 'running'}
      eyebrow="FUND"
      title={phase === 'done' ? 'Private balance ready' : hasBalance ? 'Fund your private balance' : 'Create a private balance'}
    >
      {phase === 'form' && (
        <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6">
          <div>
            <FieldLabel hint={valid ? `≈ ${fmtUsd(ethToUsd(amount))}` : custom && customValue ? 'enter 0.001 – 100' : undefined}>AMOUNT</FieldLabel>
            <AmountPicker
              presets={[0.05, 0.1, 0.25]}
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
              ['DEPOSIT', valid ? `${fmtEth(amount)} ETH` : '—'],
              ['PRIVATE CREDITS', valid ? <span className="text-fg">~{fmtEth(credits)} ETH</span> : '—'],
              ['PROTOCOL FEE', `${(PROTOCOL_FEE * 100).toFixed(1)}%`],
              ['NETWORK', wallet ? chainName(wallet.chainId) : 'Ethereum'],
            ]}
          />
          <DemoNotice>
            Demo mode: no transaction is broadcast and {wallet?.kind === 'injected' ? 'your wallet will not be asked to sign' : 'no funds move'}. The deposit is
            simulated in this browser.
          </DemoNotice>
          <Button variant="primary" size="lg" block onClick={submit} disabled={!valid || !wallet}>
            Create private balance
          </Button>
        </div>
      )}

      {phase !== 'form' && (
        <div className="px-5 pb-5 pt-4 sm:px-6">
          <div className="rounded-md border border-line bg-[#08080a] px-4 py-2">
            <TerminalSteps defs={STEPS} state={steps.state} />
          </div>
          {phase === 'done' && receipt && (
            <div className="mt-5">
              <div className="flex items-center gap-4">
                <SuccessMark />
                <div>
                  <div className="font-mono text-[11px] tracking-[0.12em] text-dim">PRIVATE BALANCE</div>
                  <div className="mt-0.5 text-[26px] font-medium tracking-[-0.03em] text-fg">
                    <AnimatedNumber value={display} format={(v) => fmtEth(v)} duration={1100} />{' '}
                    <span className="font-mono text-[13px] text-muted">ETH</span>
                  </div>
                </div>
                <div className="ml-auto text-right font-mono text-[12px] text-ok">+{fmtEth(receipt.creditsEth)}</div>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-muted">
                Your note is stored on this device. From here on, requests are paid with proofs, and your wallet{' '}
                <span className="text-soft">doesn&apos;t appear in any of them</span>.
              </p>
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
        </div>
      )}
    </Modal>
  )
}

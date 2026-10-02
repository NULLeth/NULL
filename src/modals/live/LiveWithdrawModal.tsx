import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CopyAddress } from '../../components/ui/CopyAddress'
import { Modal } from '../../components/ui/Modal'
import { StatusLog, useStatusLog } from '../../components/ui/StatusLog'
import { fmtEth, fmtUsd } from '../../lib/format'
import { getActiveProvider } from '../../lib/wallet'
import { errorMessage } from '../../live/client'
import { useLive } from '../../live/LiveProvider'
import { useAccount } from '../../live/useAccount'
import { useUi } from '../../state/ui'
import { DemoNotice, SuccessMark, Summary } from '../parts'

export function LiveWithdrawModal({ open }: { open: boolean }) {
  const live = useLive()
  const account = useAccount()
  const ui = useUi()
  const [phase, setPhase] = useState<'form' | 'running' | 'done' | 'error'>('form')
  const [mode, setMode] = useState<'mutual' | 'escape'>('mutual')
  const log = useStatusLog()

  useEffect(() => {
    if (open) {
      setPhase('form')
      setMode('mutual')
      log.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const wallet = account.wallet
  const amount = live?.balanceEth ?? 0

  const run = async (m: 'mutual' | 'escape') => {
    if (!live || !wallet) return
    setMode(m)
    setPhase('running')
    log.reset()
    try {
      const client = await live.client()
      client.setWalletProvider(getActiveProvider())
      // Funds go back to the connected wallet (the SDK default). No arbitrary payout addresses.
      await client.withdraw(m, log.push)
      log.finish(true, m === 'mutual' ? 'Withdrawal submitted.' : 'Emergency withdrawal started. Finalize it after the 24-hour challenge period.')
      live.addLog({ kind: 'withdraw', actor: 'YOU', amountEth: amount, detail: m === 'mutual' ? 'note closed · to your wallet' : 'escape withdrawal · 24 h challenge' })
      await live.refresh()
      setPhase('done')
    } catch (err) {
      log.finish(false, errorMessage(err))
      setPhase('error')
    }
  }

  return (
    <Modal open={open} onClose={ui.close} locked={phase === 'running'} eyebrow="WITHDRAW · MAINNET" title={phase === 'done' ? 'Withdrawal on its way' : 'Close & withdraw'}>
      {!live?.hasNote && phase === 'form' ? (
        <div className="px-6 py-8 text-[14px] text-muted">There is no active private balance in this browser.</div>
      ) : !wallet && phase === 'form' ? (
        <div className="space-y-4 px-5 pb-5 pt-5 sm:px-6">
          <p className="text-[14px] leading-relaxed text-muted">Connect the wallet that should receive the funds and pay the withdrawal gas.</p>
          <Button variant="primary" block onClick={() => ui.open({ name: 'connect', then: 'withdraw' })}>
            Connect wallet
          </Button>
        </div>
      ) : phase === 'form' ? (
        <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6">
          <Summary
            rows={[
              ['PRIVATE BALANCE', <span className="text-fg">{fmtEth(amount, 6)} ETH</span>],
              ['APPROX.', live?.ethUsd ? fmtUsd(amount * live.ethUsd, { cents: true }) : '—'],
              ['TO', wallet ? <CopyAddress value={wallet.address} /> : '—'],
              ['GAS', 'paid by the connected wallet'],
            ]}
          />
          <p className="text-[12.5px] leading-relaxed text-dim">
            Closing finishes any open request, settles its usage and returns the remainder to the connected wallet. The withdrawal shows only that a note
            was closed, not which requests it paid for.
          </p>
          <DemoNotice>Real transaction on Ethereum mainnet.</DemoNotice>
          <Button variant="primary" size="lg" block onClick={() => run('mutual')}>
            Close & withdraw
          </Button>
        </div>
      ) : (
        <div className="px-5 pb-5 pt-4 sm:px-6">
          <StatusLog lines={log.lines} />
          {phase === 'done' && (
            <div className="mt-5 flex items-center gap-4">
              <SuccessMark />
              <p className="flex-1 text-[13px] leading-relaxed text-muted">
                {mode === 'mutual' ? 'The remaining balance is on its way to your wallet.' : 'Emergency withdrawal recorded. Come back after 24 hours to finalize it.'}
              </p>
              <Button variant="primary" onClick={ui.close}>
                Done
              </Button>
            </div>
          )}
          {phase === 'error' && (
            <div className="mt-4 space-y-3">
              {mode === 'mutual' && (
                <p className="text-[12.5px] leading-relaxed text-dim">
                  If the zkAPI server is unreachable you can still exit on your own: an emergency withdrawal goes straight to the vault and pays out after a
                  24-hour challenge period.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setPhase('form')}>
                  Back
                </Button>
                {mode === 'mutual' && (
                  <Button variant="danger" onClick={() => run('escape')}>
                    Emergency withdrawal
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

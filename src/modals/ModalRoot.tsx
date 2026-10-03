import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info, TriangleAlert } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useUi } from '../state/ui'
import { AgentModal } from './AgentModal'
import { ConnectModal } from './ConnectModal'
import { DocsModal } from './DocsModal'
import { FundModal } from './FundModal'
import { PlaygroundModal } from './PlaygroundModal'
import { TorModal } from './TorModal'
import { WithdrawModal } from './WithdrawModal'
import { IS_LIVE } from '../config/mode'
import { LiveFundModal } from './live/LiveFundModal'
import { LiveWithdrawModal } from './live/LiveWithdrawModal'

export function ModalRoot() {
  const { modal } = useUi()
  const name = modal?.name
  return (
    <>
      <ConnectModal open={name === 'connect'} then={modal?.name === 'connect' ? modal.then : undefined} />
      {IS_LIVE ? <LiveFundModal open={name === 'fund'} /> : <FundModal open={name === 'fund'} />}
      {IS_LIVE ? <LiveWithdrawModal open={name === 'withdraw'} /> : <WithdrawModal open={name === 'withdraw'} />}
      <AgentModal open={name === 'agent'} />
      <PlaygroundModal open={name === 'playground'} initial={modal?.name === 'playground' ? modal.serviceId : 'claude'} />
      <DocsModal open={name === 'docs'} />
      <TorModal open={name === 'tor'} />
      <Toaster />
    </>
  )
}

function Toaster() {
  const { toasts } = useUi()
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[150] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:bottom-6">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex max-w-[420px] items-center gap-2.5 rounded-lg border border-line-2 bg-raised/95 px-4 py-3 text-[13px] text-soft shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur"
          >
            {t.tone === 'ok' ? (
              <Check className="size-3.5 shrink-0 text-ok" strokeWidth={2.4} />
            ) : t.tone === 'warn' ? (
              <TriangleAlert className="size-3.5 shrink-0 text-warn" />
            ) : (
              <Info className="size-3.5 shrink-0 text-muted" />
            )}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

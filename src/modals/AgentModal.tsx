import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { TerminalSteps, useSteps, type StepDef } from '../components/ui/TerminalSteps'
import { fmtEth, fmtUsd, ethToUsd } from '../lib/format'
import { backend, type ServiceGroup } from '../protocol'
import { useNull } from '../state/store'
import { scrollToId, useUi } from '../state/ui'
import { CAPABILITY_LABEL, type Capability } from '../state/types'
import { AmountPicker, FieldLabel, parseAmount, SuccessMark, Summary } from './parts'

const STEPS: StepDef[] = [
  { id: 'derive', label: 'Deriving agent spend key...' },
  { id: 'allocate', label: 'Allocating private budget...' },
  { id: 'scope', label: 'Scoping credentials...' },
  { id: 'online', label: 'Agent online.' },
]

const NAMES = ['SPECTRE', 'CIPHER', 'WRAITH', 'VESPER', 'HALCYON', 'ORACLE', 'PHANTOM', 'NOMAD', 'KESTREL', 'ECHO']

const CAPS: { id: Capability; hint: string }[] = [
  { id: 'ai', hint: 'Claude, GPT, OpenRouter' },
  { id: 'search', hint: 'Live web results' },
  { id: 'rpc', hint: 'Read Ethereum state' },
  { id: 'image', hint: 'Generate images' },
]

const SCOPE: Record<Capability, ServiceGroup> = { ai: 'ai', search: 'data', rpc: 'blockchain', image: 'media' }

export function AgentModal({ open }: { open: boolean }) {
  const { state, deployAgent } = useNull()
  const ui = useUi()
  const [name, setName] = useState('SPECTRE')
  const [preset, setPreset] = useState<number | null>(0.05)
  const [custom, setCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [caps, setCaps] = useState<Capability[]>(['ai', 'search', 'rpc'])
  const [phase, setPhase] = useState<'form' | 'running' | 'done'>('form')
  const steps = useSteps(STEPS)

  useEffect(() => {
    if (!open) return
    const taken = new Set(state.agents.map((a) => a.name))
    setName(NAMES.find((n) => !taken.has(n)) ?? `AGENT-${state.agents.length + 1}`)
    setPhase('form')
    steps.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const budget = custom ? parseAmount(customValue) : (preset ?? 0)
  const cleanName = name.trim().toUpperCase()
  const nameTaken = state.agents.some((a) => a.name === cleanName)
  const enough = budget <= state.balanceEth + 1e-9
  const validBudget = Number.isFinite(budget) && budget >= 0.001
  const ok = cleanName.length >= 2 && !nameTaken && validBudget && enough && caps.length > 0

  const toggle = (c: Capability) => setCaps((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))

  const submit = async () => {
    if (!ok) return
    setPhase('running')
    const cred = await backend.access.issueAgentCredential({ name: cleanName, budgetEth: budget, scope: caps.map((c) => SCOPE[c]) }, steps.onStep)
    deployAgent({ name: cleanName, budgetEth: budget, capabilities: caps, agentKey: cred.agentKey })
    setPhase('done')
  }

  let error: string | null = null
  if (nameTaken) error = `An agent called ${cleanName} already exists.`
  else if (validBudget && !enough) error = `Budget exceeds your private balance (${fmtEth(state.balanceEth)} ETH).`
  else if (!caps.length) error = 'Pick at least one capability.'

  return (
    <Modal
      open={open}
      onClose={ui.close}
      locked={phase === 'running'}
      eyebrow="PRIVATE AGENTS"
      title={phase === 'done' ? `${cleanName} is live` : 'Create agent'}
    >
      {phase === 'form' && (
        <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6">
          <div>
            <FieldLabel hint={`${cleanName.length}/16`}>NAME</FieldLabel>
            <input
              data-autofocus
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9-_ ]/g, ''))}
              spellCheck={false}
              className="h-12 w-full rounded-md border border-line-2 bg-white/[0.015] px-4 font-mono text-[16px] tracking-[0.2em] text-fg outline-none focus:border-line-3"
              aria-label="Agent name"
            />
          </div>
          <div>
            <FieldLabel hint={validBudget ? `≈ ${fmtUsd(ethToUsd(budget))}` : undefined}>BUDGET</FieldLabel>
            <AmountPicker
              presets={[0.01, 0.025, 0.05]}
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
          <div>
            <FieldLabel>CAPABILITIES</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {CAPS.map(({ id, hint }) => {
                const on = caps.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(id)}
                    className={`flex items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-colors ${on ? 'border-line-3 bg-white/[0.04]' : 'border-line-2 hover:border-line-3'}`}
                  >
                    <span
                      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${on ? 'border-fg bg-fg text-bg' : 'border-line-3'}`}
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[11.5px] tracking-[0.1em] text-fg">{CAPABILITY_LABEL[id].toUpperCase()}</span>
                      <span className="block text-[12px] text-dim">{hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <Summary
            rows={[
              ['FROM PRIVATE BALANCE', validBudget ? `${fmtEth(budget)} ETH` : '—'],
              ['REMAINING BALANCE', validBudget && enough ? `${fmtEth(state.balanceEth - budget)} ETH` : '—'],
              ['LINK TO YOUR WALLET', <span className="text-ok">NONE</span>],
            ]}
          />
          {error && <p className="font-mono text-[11.5px] text-bad">{error}</p>}
          <Button variant="primary" size="lg" block onClick={submit} disabled={!ok}>
            Deploy agent
          </Button>
        </div>
      )}
      {phase !== 'form' && (
        <div className="px-5 pb-5 pt-4 sm:px-6">
          <div className="rounded-md border border-line bg-[#08080a] px-4 py-2">
            <TerminalSteps defs={STEPS} state={steps.state} />
          </div>
          {phase === 'done' && (
            <div className="mt-5">
              <div className="flex items-center gap-4">
                <SuccessMark />
                <p className="flex-1 text-[13px] leading-relaxed text-muted">
                  <span className="font-mono tracking-[0.12em] text-fg">{cleanName}</span> has {fmtEth(budget)} ETH to spend on{' '}
                  {caps.map((c) => CAPABILITY_LABEL[c]).join(', ')}. You can pause or recall it at any time.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    ui.close()
                    setTimeout(() => scrollToId('agents'), 120)
                  }}
                >
                  Watch it work
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

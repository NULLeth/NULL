import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ServiceId } from '../protocol'

export type ModalState =
  | { name: 'connect'; then?: 'fund' | 'withdraw' }
  | { name: 'fund' }
  | { name: 'withdraw' }
  | { name: 'agent' }
  | { name: 'playground'; serviceId: ServiceId }
  | { name: 'docs' }
  | { name: 'tor' }
  | null

export type DashTab = 'overview' | 'services' | 'agents' | 'activity'

export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'info' | 'warn'
}

interface UiApi {
  modal: ModalState
  open(m: Exclude<ModalState, null>): void
  close(): void
  dashTab: DashTab
  setDashTab(t: DashTab): void
  toasts: Toast[]
  toast(text: string, tone?: Toast['tone']): void
}

const Ctx = createContext<UiApi | null>(null)
let toastSeq = 1

export function UiProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null)
  const [dashTab, setDashTab] = useState<DashTab>('overview')
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = toastSeq++
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  const api = useMemo<UiApi>(
    () => ({
      modal,
      open: setModal,
      close: () => setModal(null),
      dashTab,
      setDashTab,
      toasts,
      toast,
    }),
    [modal, dashTab, toasts, toast],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useUi(): UiApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useUi outside UiProvider')
  return v
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

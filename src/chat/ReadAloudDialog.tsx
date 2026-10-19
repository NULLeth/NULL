import { Check, CloudOff, Volume2 } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { pickVoice, speak, supported, type ReadAloudSettings } from './readAloud'

/** Read Aloud settings: which on-device voice, how fast, and whether new answers are read out. */
export function ReadAloudDialog({
  open,
  onClose,
  local,
  cloud,
  settings,
  onChange,
}: {
  open: boolean
  onClose: () => void
  local: SpeechSynthesisVoice[]
  cloud: SpeechSynthesisVoice[]
  settings: ReadAloudSettings
  onChange: (s: ReadAloudSettings) => void
}) {
  const current = pickVoice(local, settings.voice)
  const tryVoice = (v: SpeechSynthesisVoice) => speak('Hi, I read NULL’s answers on this device. Nothing I say goes to a server.', v, settings.rate, {})

  return (
    <Modal open={open} onClose={onClose} eyebrow="PRIVACY · READ ALOUD" title="Listen on your device" width="md">
      <div className="space-y-4 px-5 pb-6 pt-4 sm:px-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          NULL reads answers with a voice that runs <span className="text-fg">on this device</span>. Browsers also offer cloud voices: those send the text to a server to turn
          it into sound, so NULL never uses them.
        </p>

        {!supported() || !local.length ? (
          <p className="rounded-md border border-warn/30 bg-warn/[0.05] px-3 py-3 text-[13px] leading-relaxed text-warn/90">
            This browser has no on-device voice. NULL won&apos;t fall back to a cloud voice, so Read Aloud is off here. On Windows, macOS, iOS and Android the system
            voices work.
          </p>
        ) : (
          <div>
            <div className="mb-1.5 font-mono text-[10.5px] tracking-[0.14em] text-dim">ON-DEVICE VOICES · {local.length}</div>
            <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
              {local.map((v) => {
                const on = current?.voiceURI === v.voiceURI
                return (
                  <div key={v.voiceURI} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${on ? 'border-ok/35 bg-ok/[0.05]' : 'border-line-2 bg-panel/50'}`}>
                    <button type="button" onClick={() => onChange({ ...settings, voice: v.voiceURI })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-ok bg-ok text-bg' : 'border-line-3'}`}>
                        {on && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-soft">{v.name}</span>
                        <span className="block font-mono text-[10.5px] text-dim">{v.lang} · on this device</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => tryVoice(v)} className="inline-flex shrink-0 items-center gap-1 font-mono text-[10.5px] text-dim hover:text-fg">
                      <Volume2 className="size-3" /> try
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-line px-3 py-2.5">
          <div className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] text-dim">
            <CloudOff className="size-3.5" />
            HIDDEN CLOUD VOICES · {cloud.length}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            {cloud.length
              ? `${cloud
                  .slice(0, 4)
                  .map((v) => v.name)
                  .join(', ')}${cloud.length > 4 ? ` and ${cloud.length - 4} more` : ''}. These send what they read to a server, so NULL doesn’t offer them.`
              : 'This browser offers none here. If it did, NULL would hide them: they send what they read to a server.'}
          </p>
        </div>

        <label className="block">
          <div className="mb-1 flex items-center justify-between font-mono text-[10.5px] tracking-[0.14em] text-dim">
            <span>SPEED</span>
            <span className="tracking-normal text-soft">{settings.rate.toFixed(1)}×</span>
          </div>
          <input type="range" min={0.6} max={2} step={0.1} value={settings.rate} onChange={(e) => onChange({ ...settings, rate: Number(e.target.value) })} className="w-full accent-[#43d392]" />
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed text-soft">
          <input type="checkbox" checked={settings.auto} onChange={(e) => onChange({ ...settings, auto: e.target.checked })} className="mt-1 accent-[#43d392]" />
          <span>
            Read new answers aloud when they&apos;re done
            <span className="block font-mono text-[11px] text-dim">with Private Voice you talk, Whisper writes it down here and the answer is read out here: only text goes to the AI</span>
          </span>
        </label>
      </div>
    </Modal>
  )
}

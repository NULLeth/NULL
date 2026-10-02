import { Fragment, type ReactNode } from 'react'

/**
 * Minimal, safe Markdown for model answers: paragraphs, headings, lists, fenced
 * code, inline code, bold, italic and http(s) links. Builds React elements only;
 * never injects HTML.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${keyBase}-${i++}`
    if (m[1]) out.push(<code key={k} className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.88em] text-soft">{m[1].slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k} className="font-semibold text-fg">{m[2].slice(2, -2)}</strong>)
    else if (m[3]) out.push(<em key={k}>{m[3].slice(1, -1)}</em>)
    else if (m[4]) {
      const label = m[4].slice(1, m[4].indexOf(']'))
      out.push(
        <a key={k} href={m[5]} target="_blank" rel="noreferrer noopener" className="text-eth underline decoration-eth/40 underline-offset-2 hover:decoration-eth">
          {label}
        </a>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'code'; lang: string; text: string }

function blocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) out.push({ kind: 'p', text: para.join(' ') })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.match(/^```\s*([\w+-]*)/)
    if (fence) {
      flush()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      out.push({ kind: 'code', lang: fence[1], text: body.join('\n') })
      continue
    }
    if (/^#{1,6}\s/.test(line)) {
      flush()
      out.push({ kind: 'h', text: line.replace(/^#{1,6}\s+/, '') })
      continue
    }
    const ul = line.match(/^\s*[-*•]\s+(.*)/)
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/)
    if (ul || ol) {
      flush()
      const kind = ul ? 'ul' : 'ol'
      const prev = out[out.length - 1]
      const item = (ul ?? ol)![1]
      if (prev && prev.kind === kind) prev.items.push(item)
      else out.push({ kind, items: [item] })
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    para.push(line.trim())
  }
  flush()
  return out
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-3.5 text-[15px] leading-[1.7] text-soft">
      {blocks(text).map((b, i) => {
        const k = `b${i}`
        switch (b.kind) {
          case 'h':
            return (
              <p key={k} className="pt-1 font-semibold text-fg">
                {inline(b.text, k)}
              </p>
            )
          case 'ul':
          case 'ol': {
            const List = b.kind === 'ul' ? 'ul' : 'ol'
            return (
              <List key={k} className={`space-y-1.5 pl-5 ${b.kind === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-dim`}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${k}-${j}`)}</li>
                ))}
              </List>
            )
          }
          case 'code':
            return (
              <pre key={k} className="overflow-x-auto rounded-lg border border-line bg-[#08080a] px-4 py-3 font-mono text-[13px] leading-relaxed text-soft">
                {b.lang && <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">{b.lang}</div>}
                <code>{b.text}</code>
              </pre>
            )
          default:
            return <p key={k}>{inline(b.text, k).map((n, j) => <Fragment key={j}>{n}</Fragment>)}</p>
        }
      })}
    </div>
  )
}

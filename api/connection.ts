/**
 * /api/connection — tells NULL Chat whether this request arrived through Tor.
 *
 * The caller's IP (which Vercel sees on every request anyway) is compared with
 * the Tor Project's public list of exit relays. Nothing is stored or logged by
 * NULL, and no third party is asked about the visitor: the only outside fetch is
 * the exit list itself, kept for 30 minutes per running function. The answer
 * carries a masked IP so a screenshot of the check never shows the full address.
 */

const EXITS_URL = 'https://check.torproject.org/torbulkexitlist'
const TTL_MS = 30 * 60_000

let exits: { at: number; set: Set<string> } | null = null

async function exitList(): Promise<Set<string> | null> {
  if (exits && Date.now() - exits.at < TTL_MS) return exits.set
  try {
    const res = await fetch(EXITS_URL, { headers: { 'user-agent': 'nullzk.com connection check' }, signal: AbortSignal.timeout(8_000) })
    if (!res.ok) throw new Error(`exit list ${res.status}`)
    const set = new Set(
      (await res.text())
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
    )
    // a near-empty list means a bad fetch, not a Tor network without exits
    if (set.size > 100) exits = { at: Date.now(), set }
  } catch {
    /* keep the last good list, if any */
  }
  return exits?.set ?? null
}

export function clientIp(req: Request): string | null {
  const real = req.headers.get('x-real-ip')?.trim()
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return real || forwarded || null
}

/** 185.220.101.47 → 185.220.101.•••, 2001:db8:1:2::5 → 2001:db8:1:••• */
export function maskIp(ip: string): string {
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}:•••`
  const parts = ip.split('.')
  return parts.length === 4 ? `${parts.slice(0, 3).join('.')}.•••` : '•••'
}

export async function GET(request: Request): Promise<Response> {
  const ip = clientIp(request)
  const list = await exitList()
  const body = {
    /** true when the IP is a current Tor exit */
    tor: !!ip && !!list?.has(ip),
    /** false when the exit list couldn't be loaded, so `tor` is unknown */
    checked: !!list,
    ip: ip ? maskIp(ip) : null,
  }
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

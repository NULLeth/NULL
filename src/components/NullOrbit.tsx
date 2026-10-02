/**
 * Hero focal piece: the ∅ mark drawn as thin orbit lines, with services sitting
 * on the ring and packets passing through the slash (the private layer).
 * Pure SVG + CSS/SMIL animation, all strokes hairline and low-contrast.
 */
const NODES: { a: number; label?: string; you?: boolean }[] = [
  { a: 180, label: 'you · 0x71F…92A', you: true },
  { a: -150, label: 'anthropic/claude' },
  { a: -112, label: 'openai/gpt' },
  { a: 150, label: 'ethereum/mainnet' },
  { a: 118, label: 'agent · SPECTRE' },
  // right half sits partly off-screen: dots only
  { a: -40 },
  { a: 22 },
  { a: 70 },
]

const C = 300
const R_MID = 196

function polar(r: number, deg: number) {
  const t = (deg * Math.PI) / 180
  return { x: C + r * Math.cos(t), y: C + r * Math.sin(t) }
}

export function NullOrbit({ className = '' }: { className?: string }) {
  const s1 = polar(268, 135)
  const s2 = polar(268, -45)
  const ringPath = `M ${C + R_MID} ${C} A ${R_MID} ${R_MID} 0 1 1 ${C - R_MID} ${C} A ${R_MID} ${R_MID} 0 1 1 ${C + R_MID} ${C}`
  return (
    <svg viewBox="0 0 600 600" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="orbit-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8a98ff" stopOpacity="0.07" />
          <stop offset="70%" stopColor="#8a98ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={250} fill="url(#orbit-fade)" />

      {/* outer dashed ring, slowly turning */}
      <g style={{ transformOrigin: '300px 300px', animation: 'orbit-spin 120s linear infinite' }}>
        <circle cx={C} cy={C} r={268} stroke="rgb(255 255 255 / 0.09)" strokeDasharray="2 7" />
      </g>
      <g style={{ transformOrigin: '300px 300px', animation: 'orbit-spin 80s linear infinite reverse' }}>
        <circle cx={C} cy={C} r={232} stroke="rgb(255 255 255 / 0.05)" strokeDasharray="40 14 4 14" />
      </g>
      {/* service ring */}
      <circle cx={C} cy={C} r={R_MID} stroke="rgb(255 255 255 / 0.1)" />
      {/* the ∅ */}
      <circle cx={C} cy={C} r={112} stroke="rgb(255 255 255 / 0.16)" strokeWidth="1.2" />
      <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="rgb(255 255 255 / 0.14)" strokeWidth="1.2" />
      <circle cx={C} cy={C} r={3} fill="rgb(255 255 255 / 0.5)" />

      {/* nodes on the ring */}
      {NODES.map((n) => {
        const p = polar(R_MID, n.a)
        return (
          <g key={n.a}>
            <circle cx={p.x} cy={p.y} r={7} stroke={n.you ? 'rgb(138 152 255 / 0.35)' : 'rgb(255 255 255 / 0.1)'} fill="#060607" />
            <circle cx={p.x} cy={p.y} r={2.2} fill={n.you ? '#8a98ff' : 'rgb(255 255 255 / 0.7)'} />
            {n.label && (
              <text
                x={p.x - 14}
                y={p.y + 3.5}
                textAnchor="end"
                className="font-mono"
                fontSize="10.5"
                letterSpacing="0.06em"
                fill={n.you ? 'rgb(138 152 255 / 0.85)' : 'rgb(255 255 255 / 0.34)'}
              >
                {n.label}
              </text>
            )}
          </g>
        )
      })}

      {/* packets: one around the ring, one through the slash */}
      <circle r={2.6} fill="#8a98ff">
        <animateMotion dur="14s" repeatCount="indefinite" path={ringPath} />
      </circle>
      <circle r={7} fill="#8a98ff" opacity="0.14">
        <animateMotion dur="14s" repeatCount="indefinite" path={ringPath} />
      </circle>
      <circle r={2.4} fill="#43d392">
        <animateMotion dur="4.8s" repeatCount="indefinite" path={`M ${s1.x} ${s1.y} L ${s2.x} ${s2.y}`} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="4.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

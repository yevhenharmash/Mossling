import type { ReactNode } from 'react'

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'

export function dayPhase(now: number): DayPhase {
  const h = new Date(now).getHours()
  if (h >= 22 || h < 5) return 'night'
  if (h < 8) return 'dawn'
  if (h < 18) return 'day'
  return 'dusk'
}

const PALETTES: Record<DayPhase, { skyTop: string; skyBottom: string; far: string; near: string; ground: string; trees: string }> = {
  dawn: { skyTop: '#f2c9a8', skyBottom: '#f7e6c8', far: '#b9b59a', near: '#8fa27c', ground: '#6f8d5a', trees: '#5d7a55' },
  day: { skyTop: '#a9d0e0', skyBottom: '#e3efe0', far: '#a7c09a', near: '#86a872', ground: '#6e9a5a', trees: '#4f7a4e' },
  dusk: { skyTop: '#6f6a9a', skyBottom: '#e3a98c', far: '#7c7d84', near: '#5f7462', ground: '#4f6a4a', trees: '#3c5442' },
  night: { skyTop: '#121b2e', skyBottom: '#2b3a52', far: '#26344a', near: '#223a36', ground: '#1f3529', trees: '#16271f' },
}

const STARS = [
  [30, 30], [70, 18], [120, 40], [160, 14], [210, 34], [250, 20], [300, 44], [330, 16], [95, 60], [275, 64],
]

function Pine({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -40 L14 -12 L7 -12 L18 6 L-18 6 L-7 -12 L-14 -12 Z" />
      <rect x={-2} y={6} width={4} height={6} />
    </g>
  )
}

type Props = { now: number; children?: ReactNode; showDoorOpen?: boolean }

export function Scene({ now, children, showDoorOpen }: Props) {
  const phase = dayPhase(now)
  const c = PALETTES[phase]
  return (
    <div className={`scene phase-${phase}`}>
      <svg className="scene-bg" viewBox="0 0 360 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.skyTop} />
            <stop offset="100%" stopColor={c.skyBottom} />
          </linearGradient>
        </defs>
        <rect width={360} height={300} fill="url(#sky)" />

        {phase === 'night' && (
          <g fill="#f4f0d8">
            {STARS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} className="star" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
            <circle cx={290} cy={52} r={14} fill="#f4efd6" />
            <circle cx={296} cy={48} r={12} fill={c.skyTop} />
          </g>
        )}
        {phase !== 'night' && <circle cx={phase === 'dawn' ? 60 : phase === 'dusk' ? 300 : 280} cy={phase === 'day' ? 50 : 110} r={18} fill="#fbeec4" opacity={0.85} />}

        <path d="M0 170 C60 140 110 150 160 160 C220 172 280 130 360 150 L360 300 L0 300 Z" fill={c.far} />
        <g fill={c.trees} opacity={0.9}>
          <Pine x={30} y={168} s={1} />
          <Pine x={55} y={172} s={0.8} />
          <Pine x={318} y={158} s={1.1} />
          <Pine x={340} y={164} s={0.8} />
        </g>
        <path d="M0 205 C80 185 150 195 210 200 C270 205 310 185 360 192 L360 300 L0 300 Z" fill={c.near} />

        {/* burrow in the hillside */}
        <g transform="translate(282 214)">
          <ellipse cx={0} cy={0} rx={30} ry={26} fill={c.ground} />
          <path d="M-17 14 v-14 a17 17 0 0 1 34 0 v14 z" fill={showDoorOpen ? '#2a1c12' : '#8a6440'} />
          {!showDoorOpen && (
            <>
              <path d="M-17 0 h34 M0 -17 v31" stroke="#6b4c30" strokeWidth={1.4} />
              <circle cx={9} cy={4} r={1.8} fill="#e2c27a" />
            </>
          )}
          {phase === 'night' && <circle cx={-24} cy={-14} r={3} fill="#ffd98a" className="lantern" />}
        </g>

        <path d="M0 240 C90 228 270 228 360 240 L360 300 L0 300 Z" fill={c.ground} />
        <ellipse cx={180} cy={262} rx={80} ry={14} fill="#000" opacity={0.08} />
      </svg>
      <div className="scene-fg">{children}</div>
    </div>
  )
}

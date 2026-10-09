import type { ReactNode } from 'react'

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'

/** Lighting phase for the sky, from the local hour. */
export function dayPhase(now: number): DayPhase {
  const h = new Date(now).getHours()
  if (h < 6 || h >= 21) return 'night'
  if (h < 9) return 'dawn'
  if (h < 18) return 'day'
  return 'dusk'
}

const SKIES: Record<DayPhase, [string, string]> = {
  dawn: ['#f2c9a8', '#f7e6c8'],
  day: ['#a9d0e0', '#e3efe0'],
  dusk: ['#6f6a9a', '#e3a98c'],
  night: ['#121b2e', '#2b3a52'],
}
/** Land colours in daylight. Dusk and night are mixed from these. */
const LAND = { far: '#a7c09a', near: '#86a872', ground: '#6e9a5a', trees: '#4f7a4e' }
const NIGHT_TINT = '#0e1826'
const SHADE: Record<DayPhase, number> = { dawn: 0.08, day: 0, dusk: 0.3, night: 0.68 }

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

const INK = '#3b3a33'

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

type Props = {
  now: number
  /** Lights out: the burrow goes dark, like the original's blank screen. */
  dark: boolean
  children?: ReactNode
}

export function Scene({ now, dark, children }: Props) {
  const phase = dayPhase(now)
  const [skyTop, skyBottom] = SKIES[phase]
  const shade = (c: string) => mix(c, NIGHT_TINT, SHADE[phase])
  const c = { far: shade(LAND.far), near: shade(LAND.near), ground: shade(LAND.ground), trees: shade(LAND.trees) }

  return (
    <div className={`scene phase-${phase}`}>
      <svg className="scene-bg" viewBox="0 0 360 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          {/* Paper grain: soft noise multiplied over everything. */}
          <filter id="paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="3" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.55 0" />
          </filter>
          <filter id="sceneInk">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="11" />
            <feDisplacementMap in="SourceGraphic" scale="3" />
          </filter>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="100%" stopColor={skyBottom} />
          </linearGradient>
        </defs>
        <rect width={360} height={300} fill="url(#sky)" />

        {phase === 'night' && (
          <g fill="#f4f0d8">
            {STARS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} className="star" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
            <circle cx={290} cy={52} r={14} fill="#f4efd6" />
            <circle cx={296} cy={48} r={12} fill={skyTop} />
          </g>
        )}
        {phase !== 'night' && (
          <circle cx={phase === 'dawn' ? 60 : phase === 'dusk' ? 300 : 280} cy={phase === 'day' ? 50 : 110} r={18} fill="#fbeec4" opacity={0.85} />
        )}

        <g filter="url(#sceneInk)" stroke={INK} strokeOpacity={phase === 'night' ? 0.5 : 0.35} strokeWidth={1.3} strokeLinejoin="round">
          <path d="M-10 170 L0 170 C60 140 110 150 160 160 C220 172 280 130 360 150 L370 150 L370 310 L-10 310 Z" fill={c.far} />
          <g fill={c.trees} opacity={0.9}>
            <Pine x={30} y={168} s={1} />
            <Pine x={55} y={172} s={0.8} />
            <Pine x={318} y={158} s={1.1} />
            <Pine x={340} y={164} s={0.8} />
          </g>
          <path d="M-10 205 L0 205 C80 185 150 195 210 200 C270 205 310 185 360 192 L370 192 L370 310 L-10 310 Z" fill={c.near} />

          {/* burrow in the hillside */}
          <g transform="translate(282 214)">
            <ellipse cx={0} cy={0} rx={30} ry={26} fill={c.ground} />
            <path d="M-17 14 v-14 a17 17 0 0 1 34 0 v14 z" fill="#8a6440" />
            <path d="M-17 0 h34 M0 -17 v31" stroke="#6b4c30" strokeWidth={1.4} />
            <circle cx={9} cy={4} r={1.8} fill="#e2c27a" />
            {(phase === 'night' || phase === 'dusk') && !dark && <circle cx={-24} cy={-14} r={3} fill="#ffd98a" className="lantern" />}
          </g>

          <path d="M-10 240 L0 240 C90 228 270 228 360 240 L370 240 L370 310 L-10 310 Z" fill={c.ground} />
        </g>

        <ellipse cx={180} cy={262} rx={80} ry={14} fill="#000" opacity={0.08} />
        <rect width={360} height={300} filter="url(#paper)" opacity={0.35} style={{ mixBlendMode: 'multiply' }} />
      </svg>
      <div className="scene-fg">{children}</div>
      {dark && <div className="lights-out" aria-hidden />}
    </div>
  )
}

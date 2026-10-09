import type { ReactNode } from 'react'
import { Glyph, ICONS, ICON_LABELS, type IconId } from './icons'

// The toy you hold: a smooth river pebble with moss growing over the top, a
// screen set into it, a ring of painted icons and three wooden buttons. Our own
// shape (no egg, no chain): only the idea of a pet in your pocket is borrowed.

export type Button = 'a' | 'b' | 'c'

type Props = {
  children: ReactNode
  /** The icon the cursor is on. */
  selected?: IconId | null
  /** Lights the bell: it's calling you. */
  calling?: boolean
  /** Omit to show the icons painted on but not working (planting, the grave). */
  onIcon?: (icon: IconId) => void
  onButton?: (button: Button) => void
}

/** The shell is drawn on this grid; everything on it is placed in percent of it. */
const W = 360
const H = 474
const SCREEN = { x: 48, y: 130, w: 264, h: 220 }
const ICON_X = [81, 147, 213, 279]
const ICON_Y = [99, 383]
const BUTTONS: { id: Button; x: number; label: string }[] = [
  { id: 'a', x: 132, label: 'A: next' },
  { id: 'b', x: 180, label: 'B: choose' },
  { id: 'c', x: 228, label: 'C: back' },
]
const BUTTON_Y = 428

const pct = (v: number, of: number) => `${(v / of) * 100}%`

export function Device({ children, selected = null, calling = false, onIcon, onButton }: Props) {
  return (
    <div className="device">
      <Shell />
      {ICONS.map((icon, i) => {
        const lit = icon === 'attention' ? calling : icon === selected
        const style = { left: pct(ICON_X[i % 4], W), top: pct(ICON_Y[i < 4 ? 0 : 1], H) }
        const className = `device-icon ${lit ? 'lit' : ''} ${icon === 'attention' ? 'bell' : ''}`
        if (icon === 'attention' || !onIcon) {
          return (
            <span key={icon} className={className} style={style} role={icon === 'attention' ? 'status' : undefined} aria-label={icon === 'attention' && calling ? 'It is calling you' : undefined}>
              <Glyph id={icon} />
              <span className="caption">{ICON_LABELS[icon]}</span>
            </span>
          )
        }
        return (
          <button key={icon} className={className} style={style} onClick={() => onIcon(icon)} aria-label={ICON_LABELS[icon]} aria-pressed={lit}>
            <Glyph id={icon} />
            <span className="caption" aria-hidden>
              {ICON_LABELS[icon]}
            </span>
          </button>
        )
      })}
      <div
        className="device-screen"
        style={{ left: pct(SCREEN.x, W), top: pct(SCREEN.y, H), width: pct(SCREEN.w, W), height: pct(SCREEN.h, H) }}
      >
        {children}
      </div>
      {BUTTONS.map((b) => (
        <button
          key={b.id}
          className="device-button"
          style={{ left: pct(b.x, W), top: pct(BUTTON_Y, H) }}
          onClick={() => onButton?.(b.id)}
          disabled={!onButton}
          aria-label={b.label}
        >
          {b.id.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

const INK = '#3b3a33'
const PEBBLE =
  'M40 74 C70 28 140 14 190 16 C250 18 312 36 336 86 C354 124 352 204 350 276 C348 348 344 402 314 434 C284 462 230 466 180 466 C120 466 70 462 42 434 C14 406 8 340 8 270 C8 190 14 114 40 74 Z'
const MOSS =
  'M30 98 C20 84 28 64 44 60 C50 42 70 32 86 32 C96 18 120 13 136 18 C150 8 176 7 190 13 C206 7 232 9 244 18 C262 13 284 22 293 34 C311 34 327 46 329 62 C343 68 347 86 339 100 C331 94 325 102 318 96 C312 86 300 82 292 78 C280 72 270 78 258 72 C246 66 236 74 224 70 C210 64 196 72 182 68 C168 64 156 72 142 68 C128 64 118 72 104 70 C90 68 80 74 70 74 C58 76 50 86 46 94 C42 102 34 106 30 98 Z'
const SPECKLES = [
  [30, 180, 1.6], [24, 300, 2.2], [44, 380, 1.4], [330, 170, 2], [338, 320, 1.5], [320, 396, 2.4], [70, 448, 1.4],
  [290, 450, 1.8], [100, 120, 1.2], [262, 124, 1.5], [180, 452, 1.2], [26, 240, 1.2], [340, 250, 1.3],
]

function Shell() {
  return (
    <svg className="device-shell" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <radialGradient id="stone" cx="38%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#b8c0ad" />
          <stop offset="55%" stopColor="#959f8c" />
          <stop offset="100%" stopColor="#6b7564" />
        </radialGradient>
        <radialGradient id="shellMoss" cx="45%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#b2d18e" />
          <stop offset="100%" stopColor="#5f8a49" />
        </radialGradient>
        <linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c5546" />
          <stop offset="100%" stopColor="#7d8873" />
        </linearGradient>
        <filter id="shellInk" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
        <filter id="stoneGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.27  0 0 0 0 0.22  0 0 0 0.5 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <ellipse cx={180} cy={466} rx={150} ry={7} fill="#000" opacity={0.3} />

      <g filter="url(#shellInk)" stroke={INK} strokeWidth={2} strokeLinejoin="round">
        <path d={PEBBLE} fill="url(#stone)" />
      </g>
      <path d={PEBBLE} fill="#000" filter="url(#stoneGrain)" opacity={0.5} />
      {/* worn shine where a thumb would rub it */}
      <path d="M34 150 C30 190 30 230 34 262" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.18} />
      <g>
        {SPECKLES.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i % 3 ? '#5d6858' : '#d6dccb'} opacity={0.7} />
        ))}
      </g>

      {/* the screen is set into a carved hollow */}
      <rect x={SCREEN.x - 9} y={SCREEN.y - 9} width={SCREEN.w + 18} height={SCREEN.h + 18} rx={30} fill="url(#bezel)" stroke={INK} strokeWidth={1.6} />
      <rect x={SCREEN.x - 9} y={SCREEN.y - 9} width={SCREEN.w + 18} height={SCREEN.h + 18} rx={30} fill="none" stroke="#fff" strokeOpacity={0.18} strokeWidth={1.2} transform="translate(0 2)" />

      {/* wooden buttons sit in little cups */}
      {BUTTONS.map((b) => (
        <circle key={b.id} cx={b.x} cy={BUTTON_Y} r={19} fill="#5d6858" stroke={INK} strokeWidth={1.4} opacity={0.9} />
      ))}

      <g filter="url(#shellInk)" stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
        <path d={MOSS} fill="url(#shellMoss)" />
      </g>
      <g fill="#cfe3b0" opacity={0.8}>
        {[[70, 50], [118, 36], [160, 26], [214, 30], [262, 40], [306, 58], [96, 58], [236, 56], [330, 82], [40, 80], [186, 50]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.2} />
        ))}
      </g>
      <g fill="#4f7a3e" opacity={0.6}>
        {[[84, 64], [140, 56], [204, 58], [280, 62], [56, 70], [318, 76]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.6} />
        ))}
      </g>

      {/* a sprout, like the one on its head */}
      <g className="shell-sprout" stroke={INK} strokeWidth={1.4} strokeLinejoin="round">
        <path d="M188 14 C188 6 189 0 191 -6" fill="none" stroke="#4f7a3e" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M190 -4 C183 -12 172 -12 168 -9 C173 -3 181 -2 190 -4 Z" fill="url(#shellMoss)" />
        <path d="M190 -4 C196 -14 206 -15 210 -12 C206 -6 199 -2 190 -4 Z" fill="url(#shellMoss)" />
      </g>
      {/* a tiny toadstool on the right shoulder */}
      <g stroke={INK} strokeWidth={1.3} strokeLinejoin="round">
        <path d="M304 40 C304 32 306 28 307 26" fill="none" stroke="#efe6cf" strokeWidth={4} strokeLinecap="round" />
        <path d="M296 28 C296 18 318 18 318 28 Z" fill="#d9773f" />
        <circle cx={302} cy={23} r={1.4} fill="#fff4dc" stroke="none" />
        <circle cx={310} cy={22} r={1.8} fill="#fff4dc" stroke="none" />
      </g>
      {/* a fern curling over the left */}
      <g fill="none" stroke="#4f7a3e" strokeWidth={1.6} strokeLinecap="round">
        <path d="M36 64 C26 56 22 44 28 34 C32 30 37 32 36 37" />
        <path d="M31 54 l-6 1 M28 47 l-6 -1 M28 41 l-5 -3 M33 57 l1 -6 M30 50 l4 -4" />
      </g>
    </svg>
  )
}

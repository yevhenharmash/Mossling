// Hand-drawn icons painted on the toy, one per slot in the icon ring, plus the
// two foods in the feed menu. Drawn on a 32×32 grid in the creature's ink style.

import type { ReactNode } from 'react'

export const ICONS = ['feed', 'lights', 'play', 'medicine', 'clean', 'status', 'scold', 'attention'] as const
export type IconId = (typeof ICONS)[number]

export const ICON_LABELS: Record<IconId, string> = {
  feed: 'Feed',
  lights: 'Lights',
  play: 'Play',
  medicine: 'Medicine',
  clean: 'Clean',
  status: 'Status',
  scold: 'Not now',
  attention: 'Call',
}

const stroke = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const GLYPHS: Record<IconId | 'meal' | 'snack', ReactNode> = {
  // A bowl of something warm.
  feed: (
    <>
      <path d="M5 15 H27 C27 22 22 26 16 26 C10 26 5 22 5 15 Z" />
      <path d="M12 11 c-2 -2 2 -3 0 -6 M17 11 c-2 -2 2 -3 0 -6 M22 11 c-2 -2 2 -3 0 -6" />
    </>
  ),
  // A lantern on a hook.
  lights: (
    <>
      <path d="M16 3 v3 M12 6 h8 M11 10 h10 l-1 14 h-8 Z M10 24 h12" />
      <path d="M16 20 c-2 -2 0 -5 0 -6 c0 1 2 4 0 6 Z" />
    </>
  ),
  // A head peeking out from behind a stump: the hide-and-peek game.
  play: (
    <>
      <path d="M17 27 V16 C17 13 28 13 28 16 V27 M17 16 C17 18 28 18 28 16" />
      <path d="M17 22 C9 22 5 18 5 13 C5 8 9 5 13 5 C16 5 18 7 18 9" />
      <circle cx={10} cy={12} r={0.9} fill="currentColor" />
      <circle cx={14} cy={11} r={0.9} fill="currentColor" />
      <path d="M3 27 H29" />
    </>
  ),
  // A stoppered bottle with a leaf on its label.
  medicine: (
    <>
      <path d="M13 4 h6 M14 4 v5 C9 11 8 14 8 18 C8 24 11 27 16 27 C21 27 24 24 24 18 C24 14 23 11 18 9 V4" />
      <path d="M12 19 C14 15 19 15 20 18 C17 20 14 21 12 19 Z M12 19 l3 -1" />
    </>
  ),
  // A twig broom, sweeping.
  clean: (
    <>
      <path d="M26 3 L16 15" />
      <path d="M13 13 L19 18 L14 28 C11 27 7 25 4 21 Z" />
      <path d="M12 18 L8 23 M15 20 L12 26" />
      <path d="M22 26 h5 M24 23 h4" />
    </>
  ),
  // A heart with a little shine: how it's doing.
  status: (
    <>
      <path d="M16 26 C9 21 5 17 5 12 C5 8 8 6 11 6 C13 6 15 7 16 9 C17 7 19 6 21 6 C24 6 27 8 27 12 C27 17 23 21 16 26 Z" />
      <path d="M9 12 C9 10 10 9 12 9" />
    </>
  ),
  // An open paw held up: "not now".
  scold: (
    <>
      <path d="M10 15 V8 C10 6 13 6 13 8 V14 M13 13 V6 C13 4 16 4 16 6 V13 M16 13 V7 C16 5 19 5 19 7 V14 M19 14 V10 C19 8 22 8 22 10 V18 C22 24 19 27 15 27 C11 27 9 24 8 21 L6 17 C5 15 7 13 9 15 L10 16" />
    </>
  ),
  // A little bell, ringing.
  attention: (
    <>
      <path d="M9 22 C10 20 10 17 10 14 C10 10 12 8 16 8 C20 8 22 10 22 14 C22 17 22 20 23 22 Z M7 22 H25" />
      <path d="M14 25 C14 27 18 27 18 25 M16 8 V6" />
      <path d="M5 10 c-1 2 -1 4 0 6 M27 10 c1 2 1 4 0 6" />
    </>
  ),
  meal: (
    <>
      <path d="M5 15 H27 C27 22 22 26 16 26 C10 26 5 22 5 15 Z" />
      <path d="M10 15 C10 11 14 10 16 12 C18 10 22 11 22 15" />
    </>
  ),
  // A berry tart.
  snack: (
    <>
      <path d="M5 18 H27 L24 25 H8 Z" />
      <circle cx={11} cy={14} r={3} />
      <circle cx={17} cy={13} r={3} />
      <circle cx={22} cy={15} r={2.5} />
    </>
  ),
}

export function Glyph({ id }: { id: keyof typeof GLYPHS }) {
  return (
    <svg className="glyph" viewBox="0 0 32 32" aria-hidden>
      <g stroke="currentColor" {...stroke}>
        {GLYPHS[id]}
      </g>
    </svg>
  )
}

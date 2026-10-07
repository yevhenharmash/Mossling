export type Face = 'content' | 'restless' | 'hungry' | 'cold' | 'sleepy' | 'lonely' | 'asleep' | 'happy'

type Props = { face: Face; bundle?: boolean }

const INK = '#22301f'
const MOUND = 'M14 98 C14 52 34 27 60 27 C86 27 106 52 106 98 Q60 108 14 98 Z'
const TUFTS: [number, number, number][] = [
  [36, 42, 7],
  [50, 32, 8],
  [68, 31, 8],
  [84, 41, 7],
]

function Eyes({ face }: { face: Face }) {
  if (face === 'asleep') {
    return (
      <g stroke={INK} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <path d="M39 63 q6 4 12 0" />
        <path d="M69 63 q6 4 12 0" />
      </g>
    )
  }
  if (face === 'happy') {
    return (
      <g stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none">
        <path d="M39 64 q6 -7 12 0" />
        <path d="M69 64 q6 -7 12 0" />
      </g>
    )
  }
  // Highlight offset: lonely looks down, restless glances aside.
  const look = face === 'lonely' ? 2.5 : 0
  const lookX = face === 'restless' ? 2.5 : 0
  return (
    <g className="eyes">
      {[45, 75].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={62} rx={5.2} ry={6.2} fill={INK} />
          <circle cx={cx + 1.8 + lookX} cy={59.5 + look} r={1.7} fill="#fff" opacity={0.9} />
          {face === 'sleepy' && <path d={`M${cx - 6.5} 62 h13 v-8 h-13 z`} fill="url(#mossBody)" />}
        </g>
      ))}
      {face === 'lonely' && (
        <g stroke={INK} strokeWidth={1.6} strokeLinecap="round">
          <path d="M39 53 l9 -2.5" />
          <path d="M81 53 l-9 -2.5" />
        </g>
      )}
    </g>
  )
}

function Mouth({ face }: { face: Face }) {
  const common = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, fill: 'none' }
  switch (face) {
    case 'hungry':
      return <ellipse cx={60} cy={75} rx={3} ry={3.6} fill={INK} />
    case 'cold':
      return <path d="M53 75 l3 -2 l2 2 l2 -2 l2 2 l2 -2 l3 2" {...common} strokeWidth={1.6} />
    case 'lonely':
    case 'restless':
      return <path d="M55 76 q5 -2.5 10 0" {...common} />
    case 'asleep':
    case 'sleepy':
      return <ellipse cx={60} cy={75} rx={2} ry={1.4} fill={INK} />
    default:
      return <path d="M54 73 q6 5 12 0" {...common} />
  }
}

export function Creature({ face, bundle }: Props) {
  return (
    <svg className={`creature face-${face}`} viewBox="0 0 120 120" role="img" aria-label="Your Mossling">
      <defs>
        <radialGradient id="mossBody" cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#a7cf82" />
          <stop offset="55%" stopColor="#77a35d" />
          <stop offset="100%" stopColor="#4c7542" />
        </radialGradient>
        <linearGradient id="leaf" x1="0" x2="1">
          <stop offset="0%" stopColor="#b9dc8c" />
          <stop offset="100%" stopColor="#7fae5e" />
        </linearGradient>
      </defs>

      <ellipse cx={60} cy={108} rx={40} ry={6} fill="#000" opacity={0.18} />

      <g className="body">
        {/* root-feet */}
        <g stroke="#6b4f36" strokeWidth={3.2} strokeLinecap="round" fill="none">
          <path d="M38 100 q-4 5 -9 6" />
          <path d="M60 102 v6" />
          <path d="M82 100 q4 5 9 6" />
        </g>

        {/* outline: the silhouette stroked underneath, so only the outer edge shows */}
        <g fill="#3d5f36" stroke="#3d5f36" strokeWidth={3.2} strokeLinejoin="round">
          <path d={MOUND} />
          {TUFTS.map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <path d={MOUND} fill="url(#mossBody)" />
        <g fill="#86b469">
          {TUFTS.map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <g fill="#5d8a4c" opacity={0.6}>
          <circle cx={24} cy={78} r={4} />
          <circle cx={98} cy={80} r={3.5} />
          <circle cx={30} cy={92} r={3} />
        </g>
        {/* lichen speckles */}
        <g fill="#e6e3a3" opacity={0.75}>
          <circle cx={28} cy={66} r={1.6} />
          <circle cx={93} cy={64} r={1.3} />
          <circle cx={86} cy={88} r={1.8} />
          <circle cx={63} cy={40} r={1.2} />
        </g>

        {face === 'cold' && <path d={MOUND} fill="#9cc7e6" opacity={0.3} />}

        {/* cheeks */}
        <ellipse cx={36} cy={72} rx={5} ry={3} fill="#e79a8a" opacity={0.35} />
        <ellipse cx={84} cy={72} rx={5} ry={3} fill="#e79a8a" opacity={0.35} />

        <Eyes face={face} />
        <Mouth face={face} />

        {face === 'lonely' && <path d="M80 70 q2 4 0 6 q-2 -2 0 -6 z" fill="#a9d4f0" />}
      </g>

      {/* sprout */}
      <g className="sprout">
        <path d="M60 30 C60 22 60 18 61 12" stroke="#6f9a52" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <path d="M61 14 C55 6 46 6 42 9 C47 13 54 15 61 14 Z" fill="url(#leaf)" />
        <path d="M61 14 C66 5 75 4 79 7 C75 12 68 15 61 14 Z" fill="url(#leaf)" />
      </g>

      {face === 'cold' && (
        <g fill="#e8f4ff" className="frost">
          <circle cx={22} cy={50} r={1.6} />
          <circle cx={100} cy={46} r={1.3} />
          <circle cx={104} cy={70} r={1.1} />
        </g>
      )}

      {bundle && (
        <g>
          <circle cx={100} cy={94} r={11} fill="#c89b6d" />
          <path d="M93 86 q7 -5 14 0" stroke="#8a6440" strokeWidth={2} fill="none" />
          <circle cx={100} cy={84} r={2.4} fill="#8a6440" />
        </g>
      )}

      {face === 'asleep' && (
        <g className="zzz" fill="#f3f0dc" fontFamily="Georgia, serif" fontStyle="italic">
          <text x={88} y={30} fontSize={11}>z</text>
          <text x={96} y={20} fontSize={14}>z</text>
        </g>
      )}
    </svg>
  )
}

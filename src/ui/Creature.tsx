import type { Coat, Form, Stage } from '../core'

export type Face =
  | 'content'
  | 'restless'
  | 'hungry'
  | 'cold'
  | 'sleepy'
  | 'lonely'
  | 'asleep'
  | 'happy'
  | 'delighted'
  | 'sniffly'

type Props = { face: Face; bundle?: boolean; stage?: Stage; form?: Form | null; coat?: Coat | null }

// Storybook look: an upright, pale little forest troll drawn with a wobbly ink
// line and soft washes. Original design: leaf ears, mossy cap, moss-tufted tail,
// no snout (Moomin), no pointy ears or belly chevrons (Totoro).

const INK = '#3b3a33'
const BODY = 'M60 24 C79 24 88 38 87 53 C86 63 93 73 93 85 C93 99 79 103 60 103 C41 103 27 99 27 85 C27 73 34 63 33 53 C32 38 41 24 60 24 Z'
const MOSS_CAP = 'M37 40 C36 31 44 25 51 26 C54 22 59 21 63 23 C67 21 74 24 76 28 C82 29 85 35 83 41 C76 37 69 38 63 36 C55 38 46 36 37 40 Z'
const EYES = [52, 68]
const EYE_Y = 54

const line = { stroke: INK, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function Eyes({ face }: { face: Face }) {
  if (face === 'asleep') {
    return (
      <g {...line} fill="none" strokeWidth={2}>
        {EYES.map((x) => (
          <path key={x} d={`M${x - 4} ${EYE_Y} q4 3 8 0`} />
        ))}
      </g>
    )
  }
  if (face === 'happy' || face === 'delighted') {
    return (
      <g {...line} fill="none" strokeWidth={2}>
        {EYES.map((x) => (
          <path key={x} d={`M${x - 4} ${EYE_Y + 1} q4 -5 8 0`} />
        ))}
      </g>
    )
  }
  // Pupil offset: lonely looks down, restless glances aside.
  const dy = face === 'lonely' ? 1.6 : 0
  const dx = face === 'restless' ? 1.6 : 0
  return (
    <g>
      {EYES.map((x) => (
        <g key={x}>
          <ellipse cx={x + dx * 0.4} cy={EYE_Y + dy * 0.4} rx={2.7} ry={3.5} fill={INK} />
          <circle cx={x + 0.9 + dx} cy={EYE_Y - 1.1 + dy} r={0.9} fill="#fff" />
          {(face === 'sleepy' || face === 'sniffly') && (
            <>
              <path d={`M${x - 3.5} ${EYE_Y} h7 v-4.5 h-7 z`} fill="url(#trollBody)" />
              <path d={`M${x - 3.2} ${EYE_Y} h6.4`} {...line} strokeWidth={1.3} />
            </>
          )}
        </g>
      ))}
      {face === 'lonely' && (
        <g {...line} strokeWidth={1.3}>
          <path d="M47 46 l7 -2" />
          <path d="M73 46 l-7 -2" />
        </g>
      )}
      {face === 'cold' && (
        <g {...line} strokeWidth={1.2}>
          <path d="M47 46 q5 -2 9 0" />
          <path d="M64 46 q5 -2 9 0" />
        </g>
      )}
    </g>
  )
}

function Mouth({ face }: { face: Face }) {
  const y = 66
  const stroke = { ...line, fill: 'none' }
  switch (face) {
    case 'hungry':
      return <ellipse cx={60} cy={y + 1} rx={2.6} ry={3} fill="#7a4b42" {...line} strokeWidth={1.2} />
    case 'cold':
      return <path d={`M54 ${y} l2 -1.5 l2 1.5 l2 -1.5 l2 1.5 l2 -1.5 l2 1.5`} {...stroke} strokeWidth={1.3} />
    case 'lonely':
    case 'restless':
      return <path d={`M56 ${y + 1} q4 -2 8 0`} {...stroke} />
    case 'asleep':
    case 'sleepy':
    case 'sniffly':
      return <ellipse cx={60} cy={y} rx={1.6} ry={1.1} fill={INK} />
    case 'delighted':
      return <path d={`M54 ${y - 1.5} q6 7 12 0 z`} fill="#7a4b42" {...line} strokeWidth={1.3} />
    default:
      return <path d={`M55 ${y - 1} q5 4 10 0`} {...stroke} />
  }
}

export function Creature({ face, bundle, stage = 'sprout', form = null, coat = null }: Props) {
  const drooping = face === 'lonely' || face === 'sleepy' || face === 'sniffly'
  const leafy = stage === 'grown' || stage === 'elder'
  return (
    <svg className={`creature troll face-${face} stage-${stage} coat-${coat ?? 'none'}`} viewBox="0 0 120 120" role="img" aria-label="Your Mossling">
      <defs>
        <radialGradient id="trollBody" cx="42%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fbf8ec" />
          <stop offset="65%" stopColor="#ece8d6" />
          <stop offset="100%" stopColor="#d3d4bd" />
        </radialGradient>
        <linearGradient id="leafEar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4dca4" />
          <stop offset="100%" stopColor="#86ad69" />
        </linearGradient>
        <radialGradient id="trollMoss" cx="45%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#a9c98a" />
          <stop offset="100%" stopColor="#6c9356" />
        </radialGradient>
        {/* Slight wobble so lines read as hand-inked rather than vector-perfect. */}
        <filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </defs>

      <ellipse cx={60} cy={108} rx={28} ry={4.5} fill="#000" opacity={0.16} />

      <g className="body" filter="url(#ink)">
        {/* tail with a moss tuft, behind the body */}
        <path d="M86 90 C96 92 101 86 101 79" fill="none" {...line} strokeWidth={2.4} />
        <circle cx={101.5} cy={77} r={5} fill="url(#trollMoss)" {...line} strokeWidth={1.3} />

        {/* legs */}
        <g fill="url(#trollBody)" {...line}>
          <path d="M44 98 C44 104 43 108 49 108 C55 108 54 104 54 99" />
          <path d="M66 99 C66 104 65 108 71 108 C77 108 76 104 76 98" />
        </g>

        {/* ears: little leaves */}
        <g className="ear ear-l" style={{ transformOrigin: '42px 38px' }}>
          <path d="M42 38 C34 39 25 35 21 27 C30 24 39 28 42 38 Z" fill="url(#leafEar)" {...line} strokeWidth={1.4} />
          <path d="M41 36 C35 33 29 30 24 28" fill="none" stroke="#5f8a49" strokeWidth={1} strokeLinecap="round" />
        </g>
        <g className="ear ear-r" style={{ transformOrigin: '78px 38px' }}>
          <path d="M78 38 C86 39 95 35 99 27 C90 24 81 28 78 38 Z" fill="url(#leafEar)" {...line} strokeWidth={1.4} />
          <path d="M79 36 C85 33 91 30 96 28" fill="none" stroke="#5f8a49" strokeWidth={1} strokeLinecap="round" />
        </g>

        <path d={BODY} fill="url(#trollBody)" {...line} />
        {coat === 'glossy' && <path d="M44 34 C38 42 37 52 39 60" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" opacity={0.7} />}
        {/* belly wash */}
        <ellipse cx={60} cy={82} rx={20} ry={15} fill="#fffdf4" opacity={0.35} />
        {face === 'cold' && <path d={BODY} fill="#a9cbe3" opacity={0.28} />}

        {/* arms */}
        <g fill="none" {...line} strokeWidth={1.6}>
          <path d={drooping ? 'M33 70 C30 77 30 82 32 86' : 'M33 70 C27 74 25 79 27 83'} />
          <path d={drooping ? 'M87 70 C90 77 90 82 88 86' : 'M87 70 C93 74 95 79 93 83'} />
        </g>

        {/* moss speckles near the feet, like it has been sitting in the forest */}
        <g fill="#86a96d" opacity={0.85}>
          <circle cx={36} cy={94} r={2.2} />
          <circle cx={40} cy={98} r={1.4} />
          <circle cx={83} cy={95} r={1.8} />
        </g>

        {/* mossy cap */}
        <path d={MOSS_CAP} fill="url(#trollMoss)" {...line} strokeWidth={1.4} />
        <g fill="#c3dba3" opacity={0.8}>
          <circle cx={47} cy={33} r={1.4} />
          <circle cx={58} cy={28} r={1.2} />
          <circle cx={72} cy={31} r={1.4} />
        </g>

        {coat === 'wild' && <WildTufts />}

        {/* cheeks */}
        <ellipse cx={45} cy={63} rx={4.2} ry={2.4} fill="#e9a493" opacity={0.45} />
        <ellipse cx={75} cy={63} rx={4.2} ry={2.4} fill="#e9a493" opacity={0.45} />
        {/* small soft nose */}
        <ellipse cx={60} cy={60} rx={face === 'sniffly' ? 3 : 2.2} ry={face === 'sniffly' ? 2.2 : 1.6} fill={face === 'sniffly' ? '#d9665a' : '#c98f80'} />
        {face === 'sniffly' && <path d="M62 62 q1.4 2.6 0 4 q-1.4 -1.4 0 -4 z" fill="#bfe0f2" {...line} strokeWidth={0.7} />}

        <Eyes face={face} />
        <Mouth face={face} />

        {face === 'lonely' && <path d="M71 60 q1.6 3 0 5 q-1.6 -2 0 -5 z" fill="#a9d4f0" {...line} strokeWidth={0.8} />}

        {form && <Accessory form={form} />}
        {/* After the accessory, so the beard hangs over a scarf. */}
        {stage === 'elder' && <LichenBeard />}
      </g>

      {/* sprout growing from the moss cap */}
      <g className="sprout">
        <path d="M60 24 C60 18 60 14 61 9" fill="none" stroke="#5f8a49" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M61 11 C56 5 49 5 46 7 C50 11 55 12 61 11 Z" fill="url(#trollMoss)" {...line} strokeWidth={1.1} />
        <path d="M61 11 C65 4 72 3 75 5 C72 9 67 12 61 11 Z" fill="url(#trollMoss)" {...line} strokeWidth={1.1} />
        {leafy && <path d="M60 17 C55 15 51 16 49 19 C53 21 57 20 60 17 Z" fill="url(#trollMoss)" {...line} strokeWidth={1} />}
      </g>

      {coat === 'glossy' && (
        <g fill="#fff6cf" className="sparkles glossy">
          <path d="M32 24 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 z" stroke="#d9b54a" strokeWidth={0.6} />
          <path d="M90 44 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 z" stroke="#d9b54a" strokeWidth={0.6} />
          <path d="M24 70 l0.9 2.2 l2.2 0.9 l-2.2 0.9 l-0.9 2.2 l-0.9 -2.2 l-2.2 -0.9 l2.2 -0.9 z" stroke="#d9b54a" strokeWidth={0.6} />
          <circle cx={75} cy={6} r={1.6} fill="#d8f0ff" stroke={INK} strokeWidth={0.6} />
        </g>
      )}

      {face === 'delighted' && (
        <g fill="#f2d675" className="sparkles">
          <path d="M20 40 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" />
          <path d="M100 34 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 z" />
          <path d="M96 70 l1 2.5 l2.5 1 l-2.5 1 l-1 2.5 l-1 -2.5 l-2.5 -1 l2.5 -1 z" />
        </g>
      )}

      {face === 'cold' && (
        <g fill="#eef6ff" className="frost">
          <circle cx={24} cy={56} r={1.5} />
          <circle cx={98} cy={52} r={1.2} />
          <circle cx={100} cy={66} r={1} />
        </g>
      )}

      {bundle && (
        <g {...line} strokeWidth={1.3}>
          <circle cx={98} cy={95} r={10} fill="#c9a274" />
          <path d="M91 88 q7 -5 14 0" fill="none" />
          <circle cx={98} cy={86} r={2.2} fill="#8a6440" />
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

/** The wild coat: tousled moss sticking out every which way, with a twig in it. */
function WildTufts() {
  return (
    <g {...line} strokeWidth={1.1}>
      <path d="M37 40 l-6 -3 l4 -1 l-5 -5 l6 2 l1 -5 l3 6" fill="url(#trollMoss)" />
      <path d="M83 41 l6 -2 l-4 -2 l5 -5 l-6 1 l0 -5 l-4 5" fill="url(#trollMoss)" />
      <path d="M55 26 l-2 -6 l4 3 l2 -5 l2 5 l3 -4 l0 6" fill="url(#trollMoss)" />
      <path d="M64 31 L84 15 M75 22 l5 1 M79 18 l1 -4" fill="none" stroke="#5b3f24" strokeWidth={2.2} />
      <path d="M84 15 c3 -4 8 -4 9 -2 c-2 3 -6 4 -9 2 z" fill="#c8743d" strokeWidth={0.9} />
      <circle cx={104} cy={73} r={3} fill="url(#trollMoss)" />
      <circle cx={98} cy={74} r={2.4} fill="url(#trollMoss)" />
    </g>
  )
}

/** Wispy pale lichen hanging from the chin: the elder look. */
function LichenBeard() {
  return (
    <g fill="#d6dcc4" {...line} strokeWidth={1}>
      <path d="M50 69 C50 76 53 83 57 86 C58 81 59 78 60 76 C61 78 62 81 63 86 C67 83 70 76 70 69 C66 71 54 71 50 69 Z" />
      <path d="M55 74 q2 5 2 9 M65 74 q-2 5 -2 9" fill="none" stroke="#a9b394" strokeWidth={0.8} />
    </g>
  )
}

/** One small accessory per personality form. */
function Accessory({ form }: { form: Form }) {
  switch (form) {
    case 'homebody':
      // A knitted scarf.
      return (
        <g {...line} strokeWidth={1.3}>
          <path d="M33 70 C45 76 75 76 87 70 L88 76 C75 82 45 82 32 76 Z" fill="#c8704f" />
          <path d="M74 77 L80 92 L73 93 L69 79 Z" fill="#c8704f" />
          <path d="M42 76 v4 M52 78 v4 M62 78 v4 M72 76 v4" stroke="#e9b48f" strokeWidth={1.2} />
        </g>
      )
    case 'wanderer':
      // A satchel for its finds.
      return (
        <g {...line} strokeWidth={1.3}>
          <path d="M38 58 L84 88" fill="none" stroke="#7a5534" strokeWidth={2.4} />
          <rect x={77} y={84} width={16} height={12} rx={3} fill="#a87d52" />
          <path d="M77 88 h16" />
        </g>
      )
    case 'dreamer':
      // A little flower growing from the moss cap.
      return (
        <g {...line} strokeWidth={1}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx={74} cy={26} rx={2.6} ry={4.2} fill="#f6e8f0" transform={`rotate(${r} 74 30)`} />
          ))}
          <circle cx={74} cy={30} r={2.4} fill="#f2c95c" />
        </g>
      )
    case 'foodie':
      // A tiny mushroom sprouting from the cap.
      return (
        <g {...line} strokeWidth={1.1}>
          <path d="M45 33 v-5" stroke="#efe6cf" strokeWidth={3} />
          <path d="M39 29 C39 22 51 22 51 29 Z" fill="#c9553f" />
          <circle cx={43} cy={26} r={1} fill="#fff" stroke="none" />
          <circle cx={47.5} cy={25} r={0.9} fill="#fff" stroke="none" />
        </g>
      )
  }
}

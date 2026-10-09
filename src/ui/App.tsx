import { useEffect, useState } from 'react'
import {
  BABY_GROWS_AFTER,
  DAY,
  GAME_ROUNDS,
  HOUR,
  MAX_HEARTS,
  SPORE_HATCHES_AFTER,
  clean,
  deathRisk,
  endSleepover,
  gameSides,
  hearts,
  isFading,
  isLastDay,
  lifespan,
  lights,
  meal,
  medicine,
  nextCharacter,
  nextStepAge,
  play,
  scold,
  snack,
  snacksLeft,
  startSleepover,
  type ActionResult,
  type Grave,
  type Pet,
  type Side,
} from '../core'
import { Creature, type Face } from './Creature'
import { clock } from './clock'
import { CALL_LINES, CHARACTER_INFO, DEATH_LINES, NOTE_LINES, REFUSAL_LINES, RISK_LINES, duration, withName } from './lines'
import { Scene } from './Scene'
import { useGame } from './useGame'

type Game = ReturnType<typeof useGame>
type Reaction = { text: string; happy: boolean; until: number }

const REACTION_MS = 4500
/** Where poop gathers in the scene, oldest first. */
const POOP_SPOTS = [
  { left: '20%', top: '86%' },
  { left: '33%', top: '93%' },
  { left: '80%', top: '90%' },
  { left: '68%', top: '95%' },
]

const clockTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const dateTime = (t: number) => new Date(t).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })

export function App() {
  const game = useGame()
  if (!game.loaded) return <div className="app" />
  if (!game.save) return <PlantScreen onPlant={game.plant} />
  if (game.save.pet.died) return <GraveScreen game={game} pet={game.save.pet} graves={game.save.graves} />
  return <Home game={game} pet={game.save.pet} />
}

function PlantScreen({ onPlant }: { onPlant: (name: string) => void }) {
  return (
    <div className="app center-screen">
      <div className="card plant-card">
        <div className="plant-creature">
          <Creature face="content" character="spore" />
        </div>
        <h1>A spore is glowing in the moss…</h1>
        <p>Something small will hatch from it. Look after it well: it can grow up into many things, and it can die.</p>
        <NameForm onSubmit={onPlant} label="Plant it" />
      </div>
    </div>
  )
}

function NameForm({ onSubmit, label }: { onSubmit: (name: string) => void; label: string }) {
  const [name, setName] = useState('')
  return (
    <form
      className="name-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(name.trim() || 'Moss')
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Moss" maxLength={16} aria-label="Name" />
      <button type="submit" className="primary">
        {label}
      </button>
    </form>
  )
}

function faceOf(pet: Pet, happyReaction: boolean): Face {
  if (pet.asleep) return 'asleep'
  if (isFading(pet)) return 'fading'
  if (pet.sick) return 'sick'
  if (happyReaction) return 'happy'
  if (pet.call?.kind === 'fuss') return 'fussy'
  if (hearts(pet.hunger) <= 1) return 'hungry'
  if (hearts(pet.happy) <= 1) return 'sad'
  return 'content'
}

function statusLine(pet: Pet, now: number): string {
  const { name } = pet
  if (pet.character === 'spore') {
    return `The spore is glowing. It hatches in about ${Math.max(1, Math.ceil((pet.plantedAt + SPORE_HATCHES_AFTER - now) / 60_000))} min.`
  }
  if (pet.call) return withName(name, CALL_LINES[pet.call.kind])
  if (pet.asleep) return `${name} is fast asleep${pet.lightsOff ? ' in the dark' : ''}.`
  if (pet.sick) return `${name} is sick. It needs medicine (${pet.sick.dosesLeft} more ${pet.sick.dosesLeft === 1 ? 'dose' : 'doses'}).`
  if (pet.poops > 0) return `${name} has made a mess. Clean it up before it makes ${name} sick.`
  if (hearts(pet.hunger) <= 1) return `${name} is getting hungry.`
  if (hearts(pet.happy) <= 1) return `${name} looks bored. Play with it, or give it a snack.`
  return `${name} is content.`
}

function Home({ game, pet }: { game: Game; pet: Pet }) {
  const { now, act } = game
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!reaction) return
    const id = setTimeout(() => setReaction(null), Math.max(0, reaction.until - Date.now()))
    return () => clearTimeout(id)
  }, [reaction])

  const say = (text: string, happy: boolean) => setReaction({ text, happy, until: Date.now() + REACTION_MS })
  const run = (fn: (p: Pet, t: number) => ActionResult, success?: string) => {
    const r = act(fn)
    if (!r) return
    if (!r.ok) return say(REFUSAL_LINES[r.refusal], false)
    const lines = [success, ...r.notes.map((n) => NOTE_LINES[n])].filter(Boolean)
    say(lines.join(' ') || '…', !r.notes.includes('tummyAche') && !r.notes.includes('unfair') && !r.notes.includes('lostGame'))
  }

  const info = CHARACTER_INFO[pet.character]
  const away = pet.sleepover !== null
  const face = faceOf(pet, reaction?.happy === true)
  const bubble = reaction?.text ?? (away ? `${pet.name} is on a sleepover. Time stands still until it’s back.` : statusLine(pet, now))

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{pet.name}</h1>
          <span className="sub">
            {info.name}
            {pet.stage !== 'spore' && ` · age ${pet.age}`}
            {pet.generation > 1 && ` · generation ${pet.generation}`}
          </span>
        </div>
        <span className="time">{clockTime(now)}</span>
      </header>

      <Scene now={now} dark={pet.lightsOff && !away}>
        {!away && !playing && (
          <div className={`creature-spot stage-${pet.stage} ${reaction?.happy ? 'bounce' : ''} ${isFading(pet) ? 'fading' : ''}`}>
            <Creature face={face} character={pet.character} />
            {pet.call && !pet.asleep && (
              <span className="call-badge" aria-hidden>
                !
              </span>
            )}
          </div>
        )}
        {!away &&
          POOP_SPOTS.slice(0, pet.poops).map((spot, i) => (
            <button key={i} className="poop" style={spot} onClick={() => run(clean, 'All clean!')} aria-label="Clean up">
              <MossFluff />
            </button>
          ))}
      </Scene>

      <p className={`bubble ${reaction ? 'reacting' : ''}`} aria-live="polite">
        {bubble}
      </p>

      {away ? (
        <section className="actions">
          <p className="hint">Back by {dateTime(pet.sleepover!.until)} at the latest.</p>
          <button className="primary wide" onClick={() => run(endSleepover, `${pet.name} is home!`)}>
            Bring {pet.name} home
          </button>
        </section>
      ) : (
        <>
          <Warnings pet={pet} />
          {pet.stage !== 'spore' && <Status pet={pet} now={now} />}
          {playing ? (
            <PeekGame
              pet={pet}
              onDone={(startedAt, guesses) => {
                setPlaying(false)
                run((p, t) => play(p, startedAt, guesses, t))
              }}
              onClose={() => setPlaying(false)}
            />
          ) : pet.stage === 'spore' ? null : (
            <Actions pet={pet} now={now} run={run} onPlay={() => (pet.asleep ? say(REFUSAL_LINES.asleep, false) : setPlaying(true))} />
          )}
        </>
      )}

      {import.meta.env.DEV && <DevPanel game={game} />}
    </div>
  )
}

type Run = (fn: (p: Pet, t: number) => ActionResult, success?: string) => void

function Actions({ pet, now, run, onPlay }: { pet: Pet; now: number; run: Run; onPlay: () => void }) {
  const left = snacksLeft(pet, now)
  return (
    <section className="actions">
      <div className="action-row">
        <button onClick={() => run(meal, 'Munch munch.')}>
          <span aria-hidden>🥣</span> Meal
        </button>
        <button onClick={() => run(snack, 'A berry tart! Its eyes light up.')}>
          <span aria-hidden>🫐</span> Snack
          <small>{left} safe today</small>
        </button>
        <button onClick={onPlay}>
          <span aria-hidden>🍄</span> Play
        </button>
        <button onClick={() => run(clean, 'All clean!')} disabled={pet.poops === 0}>
          <span aria-hidden>🧹</span> Clean
        </button>
        <button onClick={() => run(medicine)} className={pet.sick ? 'urgent' : ''}>
          <span aria-hidden>💊</span> Medicine
        </button>
        <button onClick={() => run(lights)} className={pet.call?.kind === 'lights' ? 'urgent' : ''}>
          <span aria-hidden>{pet.lightsOff ? '💡' : '🌙'}</span> {pet.lightsOff ? 'Lights on' : 'Lights off'}
        </button>
        <button onClick={() => run(scold, '“Not now.” It sulks, then settles.')} className={pet.call?.kind === 'fuss' ? 'urgent' : ''}>
          <span aria-hidden>✋</span> Not now
          <small>scold a fib</small>
        </button>
        <button onClick={() => run(startSleepover, `Off to a sleepover at a friend’s burrow.`)}>
          <span aria-hidden>🎒</span> Sleepover
          <small>pause</small>
        </button>
      </div>
    </section>
  )
}

/** The stakes, always visible (the original hid them). */
function Status({ pet, now }: { pet: Pet; now: number }) {
  const next = nextCharacter(pet)
  const stepAge = nextStepAge(pet.character)
  const babyLeft = pet.plantedAt + SPORE_HATCHES_AFTER + BABY_GROWS_AFTER - now
  return (
    <section className="card status">
      <dl className="stats">
        <Hearts label="Hunger" value={pet.hunger} />
        <Hearts label="Happy" value={pet.happy} />
        <div>
          <dt>Discipline</dt>
          <dd>
            <span className="meter" role="meter" aria-valuenow={pet.discipline} aria-valuemin={0} aria-valuemax={100} aria-label="Discipline">
              <span className="meter-fill" style={{ width: `${pet.discipline}%` }} />
            </span>
          </dd>
        </div>
        <div>
          <dt>Mistakes</dt>
          <dd className="small">
            {pet.careMistakes} care (this stage) · {pet.disciplineMistakes} discipline
          </dd>
        </div>
      </dl>
      {next && (
        <p className="muted">
          {pet.character === 'speck' ? (
            <>Grows into a {CHARACTER_INFO[next].name} in {Math.max(1, Math.ceil(babyLeft / 60_000))} min.</>
          ) : (
            <>
              On track to become a <b>{CHARACTER_INFO[next].name}</b>
              {next === 'oldLichen' ? ' (the secret form!)' : ''} when it wakes up at age {stepAge}.
            </>
          )}
        </p>
      )}
      {pet.stage === 'adult' && <p className="muted">{CHARACTER_INFO[pet.character].blurb}</p>}
      <p className="muted">
        Expected to live to about age {lifespan(pet)}. Every 2 care mistakes take a year off.
      </p>
    </section>
  )
}

function Hearts({ label, value }: { label: string; value: number }) {
  const n = hearts(value)
  return (
    <div>
      <dt>{label}</dt>
      <dd className="hearts" aria-label={`${label}: ${n} of ${MAX_HEARTS}`}>
        {Array.from({ length: MAX_HEARTS }, (_, i) => (
          <span key={i} className={i < n ? 'on' : ''} aria-hidden>
            ♥
          </span>
        ))}
      </dd>
    </div>
  )
}

/** Danger, said plainly and early: what's wrong, and how long is left to fix it. */
function Warnings({ pet }: { pet: Pet }) {
  const risk = deathRisk(pet)
  if (risk) {
    return (
      <p className={`warning ${isFading(pet) ? 'danger' : ''}`} role="alert">
        {isFading(pet) ? RISK_LINES[risk.cause] : risk.cause === 'sickness' ? `${pet.name} is sick.` : `${pet.name} is starving.`} Without help it dies in about{' '}
        {duration(risk.in)}.
      </p>
    )
  }
  if (isLastDay(pet)) return <p className="warning">{pet.name} is very old now. This is its last day: spend it together.</p>
  return null
}

/** P1's game: guess which way it will peek out, five times. Three right gives +1 happy. */
function PeekGame({ pet, onDone, onClose }: { pet: Pet; onDone: (startedAt: number, guesses: Side[]) => void; onClose: () => void }) {
  const [startedAt] = useState(() => clock.now())
  const [guesses, setGuesses] = useState<Side[]>([])
  const sides = gameSides(pet.id, startedAt)
  const round = guesses.length
  const last = round > 0 ? { guess: guesses[round - 1], side: sides[round - 1] } : null
  const guess = (side: Side) => {
    const next = [...guesses, side]
    if (next.length === GAME_ROUNDS) onDone(startedAt, next)
    else setGuesses(next)
  }
  return (
    <section className="peek">
      <p className="hint">
        {last ? (last.guess === last.side ? `Yes! It peeked out on the ${last.side}. ` : `No, it peeked out on the ${last.side}. `) : `${pet.name} hides behind a stump… `}
        Round {round + 1} of {GAME_ROUNDS}: which side will it peek out?
      </p>
      <p className="score" aria-label={`${guesses.filter((g, i) => g === sides[i]).length} right so far`}>
        {sides.map((s, i) => (
          <span key={i} className={i < round ? (guesses[i] === s ? 'hit' : 'miss') : ''} />
        ))}
      </p>
      <div className="action-row two">
        <button onClick={() => guess('left')}>← Left</button>
        <button onClick={() => guess('right')}>Right →</button>
      </div>
      <button className="ghost wide" onClick={onClose}>
        Stop playing
      </button>
    </section>
  )
}

function MossFluff() {
  return (
    <svg viewBox="0 0 40 28" aria-hidden>
      <g stroke="#3b3a33" strokeWidth={1.2} strokeOpacity={0.6}>
        <ellipse cx={20} cy={22} rx={16} ry={4} fill="#000" opacity={0.12} stroke="none" />
        <circle cx={12} cy={17} r={7} fill="#a08a5c" />
        <circle cx={25} cy={16} r={8} fill="#8c7a50" />
        <circle cx={19} cy={10} r={6} fill="#9fae72" />
        <path d="M8 6 l3 4 M31 5 l-2 4 M16 20 l5 -3" fill="none" stroke="#5b4630" strokeOpacity={1} />
      </g>
    </svg>
  )
}

function GraveScreen({ game, pet, graves }: { game: Game; pet: Pet; graves: Grave[] }) {
  const all = [...graves].reverse()
  return (
    <div className="app center-screen">
      <div className="card grave-card">
        <Gravestone name={pet.name} />
        <h1>Goodbye, {pet.name}</h1>
        <p>
          {pet.name} the {CHARACTER_INFO[pet.character].name} {DEATH_LINES[pet.died!.cause]} It was {pet.age}{' '}
          {pet.age === 1 ? 'year' : 'years'} old.
        </p>
        <p className="muted">A new spore is glowing in the moss nearby. What will you call it?</p>
        <NameForm onSubmit={game.plant} label="Plant it" />
      </div>
      {all.length > 0 && (
        <section className="card">
          <h2>Mosslings you’ve raised</h2>
          <ul className="graves">
            {all.map((g) => (
              <li key={g.generation}>
                <b>{g.name}</b> · {CHARACTER_INFO[g.character].name} · age {g.age} <small>{DEATH_LINES[g.cause]}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
      {import.meta.env.DEV && <DevPanel game={game} />}
    </div>
  )
}

/** A mossy gravestone with a small spirit drifting up from it. */
function Gravestone({ name }: { name: string }) {
  return (
    <svg className="gravestone" viewBox="0 0 120 120" role="img" aria-label={`${name}'s gravestone`}>
      <ellipse cx={60} cy={106} rx={40} ry={6} fill="#000" opacity={0.15} />
      <g stroke="#3b3a33" strokeWidth={1.6} strokeLinejoin="round">
        <path d="M34 106 V58 C34 40 86 40 86 58 V106 Z" fill="#b9bdb0" />
        <path d="M34 58 C36 46 48 42 60 42 C72 42 84 46 86 58 C80 54 76 60 70 56 C64 60 58 54 52 58 C46 54 40 60 34 58 Z" fill="#86ad69" />
        <path d="M28 106 C29 99 36 97 40 101 C43 96 50 98 50 106 Z" fill="#86ad69" />
        <path d="M74 106 C75 100 82 98 86 101 C89 98 93 101 92 106 Z" fill="#86ad69" />
      </g>
      <text x={60} y={78} textAnchor="middle" fontSize={9} fontWeight={700} fill="#3b3a33">
        {name}
      </text>
      <g className="spirit" fill="#f6f3e6" stroke="#3b3a33" strokeWidth={1}>
        <path d="M60 14 C68 14 71 22 70 28 C69 34 66 36 64 40 C62 36 60 38 58 34 C56 38 52 36 51 32 C49 24 52 14 60 14 Z" opacity={0.9} />
        <circle cx={57} cy={24} r={1.2} fill="#3b3a33" stroke="none" />
        <circle cx={63} cy={24} r={1.2} fill="#3b3a33" stroke="none" />
      </g>
    </svg>
  )
}

function DevPanel({ game }: { game: Game }) {
  return (
    <details className="dev">
      <summary>Dev: time travel</summary>
      <div className="dev-row">
        <button onClick={() => game.skip(HOUR)}>+1 h</button>
        <button onClick={() => game.skip(6 * HOUR)}>+6 h</button>
        <button onClick={() => game.skip(DAY)}>+1 day, alone</button>
      </div>
      <div className="dev-row">
        <button onClick={() => game.careFor(3)}>+3 days, cared for</button>
        <button onClick={() => game.careFor(7)}>+1 week, cared for</button>
        <button onClick={() => game.careFor(30)}>+1 month, cared for</button>
      </div>
      <div className="dev-row">
        <button
          className="ghost"
          onClick={() => {
            if (confirm('Erase everything and start over?')) void game.reset()
          }}
        >
          Erase save
        </button>
      </div>
    </details>
  )
}

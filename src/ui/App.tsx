import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BABY_GROWS_AFTER,
  DAY,
  DISCIPLINE_STEP,
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
  type Refusal,
  type Side,
} from '../core'
import { Creature, type Face } from './Creature'
import { Device, type Button } from './Device'
import { clock } from './clock'
import { Glyph, ICONS, type IconId } from './icons'
import { CALL_LINES, CHARACTER_INFO, DEATH_LINES, ICON_HINTS, NOTE_LINES, REFUSAL_LINES, RISK_LINES, duration, withName } from './lines'
import { Scene } from './Scene'
import { useGame } from './useGame'

type Game = ReturnType<typeof useGame>
type Reaction = { text: string; happy: boolean; until: number }
/** What the screen is showing: the pet, or one of the toy's menus. */
type Mode =
  | { kind: 'home' }
  | { kind: 'feed'; choice: 0 | 1 }
  | { kind: 'status'; page: number }
  | { kind: 'play'; startedAt: number; guesses: Side[] }

const REACTION_MS = 4500
/** Where poop gathers in the scene, oldest first. */
const POOP_SPOTS = [
  { left: '18%', top: '86%' },
  { left: '32%', top: '93%' },
  { left: '82%', top: '90%' },
  { left: '68%', top: '95%' },
]
const STATUS_PAGES = 4
/** The icons the A button steps through. The bell only lights up. */
const PICKABLE: readonly IconId[] = ICONS.filter((i) => i !== 'attention')

const clockTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const dateTime = (t: number) => new Date(t).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })

export function App() {
  const game = useGame()
  if (!game.loaded) return <div className="app" />
  if (!game.save) return <PlantScreen game={game} />
  if (game.save.pet.died) return <GraveScreen game={game} pet={game.save.pet} graves={game.save.graves} />
  return <Home game={game} pet={game.save.pet} />
}

function PlantScreen({ game }: { game: Game }) {
  return (
    <div className="app">
      <Device>
        <Scene now={game.now} dark={false}>
          <div className="creature-spot stage-spore">
            <Creature face="content" character="spore" />
          </div>
        </Scene>
      </Device>
      <Tag>
        <b>A spore is glowing in the moss…</b> Something small will hatch from it. Look after it well: it can grow up into many things, and it can die.
        <NameForm onSubmit={game.plant} label="Plant it" />
      </Tag>
      {import.meta.env.DEV && <DevPanel game={game} />}
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

/** The paper tag tied to the toy: everything it has to say goes here. It swings when the words change. */
function Tag({ children, tone }: { children: ReactNode; tone?: 'happy' | 'warn' }) {
  return (
    <div className={`tag-wrap ${tone ?? ''}`}>
      <svg className="twine" viewBox="0 0 30 50" aria-hidden>
        <path d="M22 0 C24 18 8 28 14.5 48.5" fill="none" stroke="#c4a873" strokeWidth={2.2} strokeLinecap="round" />
      </svg>
      <div className="tag" aria-live="polite">
        {children}
      </div>
    </div>
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

/** Why a menu can't open right now, checked up front so a game isn't played for nothing. */
function menuBlocker(pet: Pet, needs: 'looking' | 'awake'): Refusal | null {
  if (pet.sleepover) return 'away'
  if (pet.stage === 'spore') return 'unhatched'
  if (needs === 'looking') return null
  if (pet.asleep) return 'asleep'
  if (pet.call?.kind === 'fuss') return 'fussing'
  return null
}

function Home({ game, pet }: { game: Game; pet: Pet }) {
  const { now, act } = game
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const [selected, setSelected] = useState<IconId | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'home' })

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
  const refuse = (r: Refusal) => say(REFUSAL_LINES[r], false)

  const use = (icon: IconId) => {
    setSelected(icon)
    setMode({ kind: 'home' })
    setReaction(null)
    const blocked = (needs: 'looking' | 'awake') => {
      const r = menuBlocker(pet, needs)
      if (r) refuse(r)
      return r !== null
    }
    switch (icon) {
      case 'feed':
        if (!blocked('awake')) setMode({ kind: 'feed', choice: 0 })
        return
      case 'play':
        if (!blocked('awake')) setMode({ kind: 'play', startedAt: clock.now(), guesses: [] })
        return
      case 'status':
        if (!blocked('looking')) setMode({ kind: 'status', page: 0 })
        return
      case 'lights':
        return run(lights, pet.lightsOff ? 'Lights on.' : 'Lights out. Sleep tight.')
      case 'medicine':
        return run(medicine, 'Gulp. Yuck!')
      case 'clean':
        return run(clean, 'All clean!')
      case 'scold':
        return run(scold, '“Not now.” It sulks, then settles.')
    }
  }

  const feed = (choice: 0 | 1) => {
    setMode({ kind: 'home' })
    if (choice === 0) run(meal, 'Munch munch.')
    else run(snack, 'A berry tart! Its eyes light up.')
  }

  const guess = (side: Side) => {
    if (mode.kind !== 'play') return
    const guesses = [...mode.guesses, side]
    if (guesses.length < GAME_ROUNDS) return setMode({ ...mode, guesses })
    setMode({ kind: 'home' })
    run((p, t) => play(p, mode.startedAt, guesses, t))
  }

  // The three buttons, like the original: A moves the cursor, B chooses, C backs out.
  const press = (button: Button) => {
    switch (mode.kind) {
      case 'feed':
        if (button === 'a') setMode({ kind: 'feed', choice: mode.choice === 0 ? 1 : 0 })
        else if (button === 'b') feed(mode.choice)
        else setMode({ kind: 'home' })
        return
      case 'status':
        if (button !== 'c' && mode.page + 1 < STATUS_PAGES) setMode({ kind: 'status', page: mode.page + 1 })
        else setMode({ kind: 'home' })
        return
      case 'play':
        if (button === 'c') setMode({ kind: 'home' })
        else guess(button === 'a' ? 'left' : 'right')
        return
      case 'home':
        if (button === 'a') {
          const next = PICKABLE[(selected ? PICKABLE.indexOf(selected) + 1 : 0) % PICKABLE.length]
          setSelected(next)
          say(ICON_HINTS[next as Exclude<IconId, 'attention'>], false)
        }
        else if (button === 'b' && selected) use(selected)
        else if (button === 'c') setSelected(null)
    }
  }

  // Keys a, b and c work as the buttons on a computer.
  const pressRef = useRef(press)
  pressRef.current = press
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'a' || key === 'b' || key === 'c') pressRef.current(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const away = pet.sleepover !== null
  const face = faceOf(pet, reaction?.happy === true)
  const risk = deathRisk(pet)
  const bubble =
    reaction?.text ??
    (mode.kind === 'play'
      ? peekHint(pet, mode)
      : mode.kind === 'feed'
        ? `What should ${pet.name} eat? A meal fills a heart of hunger, a snack a heart of happy.`
        : away
          ? `${pet.name} is on a sleepover. Time stands still until it’s back.`
          : statusLine(pet, now))

  return (
    <div className="app">
      <header className="top">
        <h1>{pet.name}</h1>
        <span className="sub">
          {CHARACTER_INFO[pet.character].name}
          {pet.stage !== 'spore' && ` · age ${pet.age}`}
          {pet.generation > 1 && ` · generation ${pet.generation}`}
        </span>
      </header>

      <Device selected={mode.kind === 'home' ? selected : modeIcon(mode)} calling={pet.call !== null} onIcon={use} onButton={press}>
        <Scene now={now} dark={pet.lightsOff && !away}>
          {away ? (
            <p className="screen-note">Away on a sleepover</p>
          ) : mode.kind === 'play' ? (
            <PeekGame pet={pet} startedAt={mode.startedAt} guesses={mode.guesses} onGuess={guess} />
          ) : (
            <>
              <div className={`creature-spot stage-${pet.stage} ${reaction?.happy ? 'bounce' : ''} ${isFading(pet) ? 'fading' : ''}`}>
                <Creature face={face} character={pet.character} />
              </div>
              {POOP_SPOTS.slice(0, pet.poops).map((spot, i) => (
                <button key={i} className="poop" style={spot} onClick={() => run(clean, 'All clean!')} aria-label="Clean up">
                  <MossFluff />
                </button>
              ))}
            </>
          )}
          {mode.kind === 'feed' && <FeedMenu pet={pet} now={now} choice={mode.choice} onPick={feed} />}
          {mode.kind === 'status' && <StatusPage pet={pet} page={mode.page} onNext={() => press('b')} />}
          <span className="screen-clock">{clockTime(now)}</span>
        </Scene>
      </Device>

      <Tag tone={risk && isFading(pet) ? 'warn' : reaction ? (reaction.happy ? 'happy' : undefined) : undefined}>
        <span key={bubble} className="tag-text">
          {bubble}
        </span>
      </Tag>

      {!away && <Warnings pet={pet} />}
      {away ? (
        <section className="notes">
          <p>Back by {dateTime(pet.sleepover!.until)} at the latest.</p>
          <button className="primary wide" onClick={() => run(endSleepover, `${pet.name} is home!`)}>
            Bring {pet.name} home
          </button>
        </section>
      ) : (
        pet.stage !== 'spore' && <Notes pet={pet} now={now} onSleepover={() => run(startSleepover, `Off to a sleepover at a friend’s burrow.`)} />
      )}

      {import.meta.env.DEV && <DevPanel game={game} />}
    </div>
  )
}

/** Keep the icon of the open menu lit. */
function modeIcon(mode: Mode): IconId | null {
  return mode.kind === 'home' ? null : mode.kind
}

/** Like the original's two-item food menu, drawn on the screen. */
function FeedMenu({ pet, now, choice, onPick }: { pet: Pet; now: number; choice: 0 | 1; onPick: (choice: 0 | 1) => void }) {
  const left = snacksLeft(pet, now)
  const items = [
    { glyph: 'meal' as const, label: 'Meal', note: `hunger ${hearts(pet.hunger)}/${MAX_HEARTS}` },
    { glyph: 'snack' as const, label: 'Snack', note: `${left} safe today` },
  ]
  return (
    <div className="screen-panel menu" role="menu">
      {items.map((item, i) => (
        <button key={item.label} role="menuitem" className={choice === i ? 'on' : ''} onClick={() => onPick(i as 0 | 1)}>
          <span className="cursor" aria-hidden>
            ▶
          </span>
          <Glyph id={item.glyph} />
          <span className="label">{item.label}</span>
          <small>{item.note}</small>
        </button>
      ))}
    </div>
  )
}

/** The original's meter screens, one page at a time. Tap or press A/B for the next page. */
function StatusPage({ pet, page, onNext }: { pet: Pet; page: number; onNext: () => void }) {
  const next = nextCharacter(pet)
  const pages = [
    <>
      <h3>Hunger</h3>
      <BigHearts value={pet.hunger} />
    </>,
    <>
      <h3>Happy</h3>
      <BigHearts value={pet.happy} />
    </>,
    <>
      <h3>Discipline</h3>
      <div className="gauge" aria-label={`Discipline ${pet.discipline}%`}>
        {Array.from({ length: 100 / DISCIPLINE_STEP }, (_, i) => (
          <span key={i} className={pet.discipline > i * DISCIPLINE_STEP ? 'on' : ''} />
        ))}
      </div>
    </>,
    <>
      <h3>
        Age {pet.age} · {CHARACTER_INFO[pet.character].name}
      </h3>
      <p>
        {next ? `Becoming a ${CHARACTER_INFO[next].name}` : CHARACTER_INFO[pet.character].blurb}
        <br />
        Lives to about {lifespan(pet)}
      </p>
    </>,
  ]
  return (
    <button className="screen-panel status-page" onClick={onNext} aria-label="Next page">
      {pages[page]}
      <span className="dots" aria-hidden>
        {pages.map((_, i) => (
          <i key={i} className={i === page ? 'on' : ''} />
        ))}
      </span>
    </button>
  )
}

function BigHearts({ value }: { value: number }) {
  const n = hearts(value)
  return (
    <p className="big-hearts" aria-label={`${n} of ${MAX_HEARTS}`}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <span key={i} className={i < n ? 'on' : ''} aria-hidden>
          ♥
        </span>
      ))}
    </p>
  )
}

/** The stakes, always in view (the original hid them): hearts, discipline, mistakes, what's next, how long it lives. */
function Notes({ pet, now, onSleepover }: { pet: Pet; now: number; onSleepover: () => void }) {
  const next = nextCharacter(pet)
  const stepAge = nextStepAge(pet.character)
  const babyLeft = pet.plantedAt + SPORE_HATCHES_AFTER + BABY_GROWS_AFTER - now
  return (
    <section className="notes">
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
          <dd>
            {pet.careMistakes} care this stage · {pet.disciplineMistakes} discipline
          </dd>
        </div>
      </dl>
      <p>
        {next &&
          (pet.character === 'speck' ? (
            <>Grows into a {CHARACTER_INFO[next].name} in {Math.max(1, Math.ceil(babyLeft / 60_000))} min. </>
          ) : (
            <>
              On track for <b>{CHARACTER_INFO[next].name}</b>
              {next === 'oldLichen' ? ' (the secret form!)' : ''} at age {stepAge}.{' '}
            </>
          ))}
        Lives to about {lifespan(pet)}; every 2 care mistakes take a year off.
      </p>
      {pet.stage === 'adult' && <p>{CHARACTER_INFO[pet.character].blurb}</p>}
      <button className="sleepover" onClick={onSleepover}>
        Sleepover <small>pauses time, up to 3 days</small>
      </button>
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

function peekHint(pet: Pet, game: Extract<Mode, { kind: 'play' }>): string {
  const sides = gameSides(pet.id, game.startedAt)
  const round = game.guesses.length
  const lastGuess = game.guesses[round - 1]
  const lastSide = sides[round - 1]
  const result = round === 0 ? `${pet.name} hides behind a stump… ` : lastGuess === lastSide ? `Yes! It peeked out on the ${lastSide}. ` : `No, it peeked out on the ${lastSide}. `
  return `${result}Round ${round + 1} of ${GAME_ROUNDS}: which side will it peek out? (A left, B right, C stop)`
}

/** P1's game on the screen: guess which way it will peek out, five times. Three right gives +1 happy. */
function PeekGame({ pet, startedAt, guesses, onGuess }: { pet: Pet; startedAt: number; guesses: Side[]; onGuess: (side: Side) => void }) {
  const sides = gameSides(pet.id, startedAt)
  const round = guesses.length
  const shown = round > 0 ? sides[round - 1] : null
  const hit = shown !== null && guesses[round - 1] === shown
  return (
    <div className="peek">
      <p className="score" aria-label={`${guesses.filter((g, i) => g === sides[i]).length} right so far`}>
        {sides.map((s, i) => (
          <span key={i} className={i < round ? (guesses[i] === s ? 'hit' : 'miss') : ''} />
        ))}
      </p>
      {shown && (
        <div key={round} className={`peeker ${shown} stage-${pet.stage}`}>
          <Creature face={hit ? 'happy' : 'content'} character={pet.character} />
        </div>
      )}
      <Stump />
      <button className="peek-side left" onClick={() => onGuess('left')} aria-label="Left">
        ◀
      </button>
      <button className="peek-side right" onClick={() => onGuess('right')} aria-label="Right">
        ▶
      </button>
    </div>
  )
}

function Stump() {
  return (
    <svg className="stump" viewBox="0 0 80 60" aria-hidden>
      <g stroke="#3b3a33" strokeWidth={1.6} strokeLinejoin="round">
        <path d="M10 58 C12 46 12 30 12 18 C12 10 68 10 68 18 C68 30 68 46 72 58 Z" fill="#8a6440" />
        <ellipse cx={40} cy={18} rx={28} ry={7} fill="#c9a26e" />
        <ellipse cx={40} cy={18} rx={16} ry={4} fill="none" stroke="#8a6440" strokeWidth={1} />
        <ellipse cx={40} cy={18} rx={6} ry={1.6} fill="none" stroke="#8a6440" strokeWidth={1} />
        <path d="M22 30 v18 M50 34 v16" stroke="#6b4c30" strokeWidth={1.2} />
        <path d="M12 22 C6 22 4 16 8 14 C12 12 14 16 13 20 Z" fill="#86ad69" />
      </g>
    </svg>
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
    <div className="app">
      <Device>
        <Scene now={game.now} dark={false}>
          <div className="grave-spot">
            <Gravestone name={pet.name} />
          </div>
        </Scene>
      </Device>
      <Tag>
        <b>Goodbye, {pet.name}.</b> {pet.name} the {CHARACTER_INFO[pet.character].name} {DEATH_LINES[pet.died!.cause]} It was {pet.age}{' '}
        {pet.age === 1 ? 'year' : 'years'} old. A new spore is glowing in the moss nearby. What will you call it?
        <NameForm onSubmit={game.plant} label="Plant it" />
      </Tag>
      {all.length > 0 && (
        <section className="notes">
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

import { useEffect, useState } from 'react'
import {
  collectFinds,
  DAY,
  feed,
  FOODS,
  findMossling,
  HOUR,
  ITEMS,
  moodOf,
  startWalk,
  tellStory,
  tuckIn,
  wake,
  type ActionResult,
  type Food,
  type ItemKind,
  type Mood,
  type NeedKey,
  type Pet,
} from '../core'
import { Creature, type Face } from './Creature'
import { FOOD_LINES, MOOD_LINES, pick, REFUSAL_LINES, STORIES, withName } from './lines'
import { Scene } from './Scene'
import { useGame } from './useGame'

type Reaction = { text: string; happy: boolean; until: number }

const REACTION_MS = 4000
const TRAIL = [
  { left: '18%', top: '78%' },
  { left: '46%', top: '62%' },
  { left: '74%', top: '80%' },
]

const NEED_LABELS: Record<NeedKey, { label: string; icon: string }> = {
  fullness: { label: 'Full', icon: '🫐' },
  warmth: { label: 'Warm', icon: '🔥' },
  rest: { label: 'Rested', icon: '🌙' },
  companionship: { label: 'Loved', icon: '🤍' },
}

const MOOD_FACE: Partial<Record<Mood, Face>> = {
  content: 'content',
  restless: 'restless',
  hungry: 'hungry',
  cold: 'cold',
  sleepy: 'sleepy',
  lonely: 'lonely',
  asleep: 'asleep',
  atDoor: 'happy',
}

const clockTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function App() {
  const game = useGame()
  if (!game.loaded) return <div className="app" />
  if (!game.pet) return <NameScreen onCreate={game.create} />
  return <Home game={game} pet={game.pet} />
}

function NameScreen({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="app name-screen">
      <div className="name-card">
        <div className="name-creature">
          <Creature face="asleep" />
        </div>
        <h1>A little patch of moss is stirring…</h1>
        <p>Something small is waking up in it. What will you call it?</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onCreate(name.trim() || 'Moss')
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Moss" maxLength={16} autoFocus />
          <button type="submit" className="primary">
            Let it sprout
          </button>
        </form>
      </div>
    </div>
  )
}

function Home({ game, pet }: { game: ReturnType<typeof useGame>; pet: Pet }) {
  const { now, act } = game
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const [feeding, setFeeding] = useState(false)
  const [trailStep, setTrailStep] = useState(0)

  // Let reactions fade on their own.
  useEffect(() => {
    if (!reaction) return
    const id = setTimeout(() => setReaction(null), Math.max(0, reaction.until - Date.now()))
    return () => clearTimeout(id)
  }, [reaction])

  const mood = moodOf(pet, now)
  const showReaction = reaction !== null
  const face: Face | null = showReaction && reaction.happy && mood !== 'asleep' ? 'happy' : MOOD_FACE[mood] ?? null

  const say = (text: string, happy: boolean) => setReaction({ text, happy, until: Date.now() + REACTION_MS })

  const run = (fn: (p: Pet, t: number) => ActionResult, success: (r: ActionResult) => string) => {
    const r = act(fn)
    if (!r) return
    setFeeding(false)
    if (r.ok) say(success(r), true)
    else say(REFUSAL_LINES[r.refusal], false)
  }

  const onFeed = (food: Food) => run((p, t) => feed(p, food, t), () => FOOD_LINES[food])
  const onStory = () =>
    run(tellStory, (r) => {
      const tale = `You tell the tale of ${pick(STORIES, now, 3)}.`
      return r.pet.asleep ? `${tale} By the end, ${pet.name} is fast asleep.` : `${tale} ${pet.name} listens, eyes wide.`
    })
  const onWalk = () => run(startWalk, () => `${pet.name} trundles off into the forest. Back in about 20 minutes.`)
  const onCollect = () =>
    run(collectFinds, (r) => `${pet.name} proudly hands you: ${describeFinds(r.ok ? r.found ?? [] : [])}.`)
  const onBed = () => run(pet.asleep ? wake : tuckIn, () => (pet.asleep ? `${pet.name} blinks awake.` : `You tuck ${pet.name} in under a leaf blanket.`))
  const onSpore = () => {
    if (trailStep < TRAIL.length - 1) return setTrailStep(trailStep + 1)
    setTrailStep(0)
    run(findMossling, () => `You find ${pet.name} curled up under a fern. It sniffles, then hugs your finger. It found you a glowcap!`)
  }

  const bubble = showReaction ? reaction.text : withName(pet.name, pick(MOOD_LINES[mood], now))
  const busy = mood === 'away' || mood === 'walking' || mood === 'atDoor'
  const ageDays = Math.floor((now - pet.bornAt) / DAY) + 1

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{pet.name}</h1>
          <span className="sub">Day {ageDays} · Sprout</span>
        </div>
        <span className="time">{clockTime(now)}</span>
      </header>

      <Scene now={now} showDoorOpen={mood === 'atDoor' || mood === 'walking'}>
        {face && (
          <div className={`creature-spot ${mood === 'atDoor' ? 'at-door' : ''} ${showReaction && reaction.happy ? 'bounce' : ''}`}>
            <Creature face={face} bundle={mood === 'atDoor'} />
          </div>
        )}
        {mood === 'away' &&
          TRAIL.slice(0, trailStep + 1).map((pos, i) => (
            <button
              key={i}
              className={`spore ${i === trailStep ? 'active' : 'seen'}`}
              style={pos}
              onClick={i === trailStep ? onSpore : undefined}
              aria-label="Follow the glowing spore"
            />
          ))}
      </Scene>

      <p className={`bubble ${showReaction ? 'reacting' : ''}`} aria-live="polite">
        {bubble}
      </p>

      <Meters pet={pet} dim={mood === 'away'} />

      <section className="actions">
        {mood === 'away' && <p className="hint">Tap the glowing spores to follow the trail.</p>}
        {mood === 'walking' && pet.activity && <p className="hint">Back around {clockTime(pet.activity.endsAt)}.</p>}
        {mood === 'atDoor' && (
          <button className="primary wide" onClick={onCollect}>
            Collect finds
          </button>
        )}
        {!busy && (
          <>
            {feeding ? (
              <div className="food-row">
                {(Object.keys(FOODS) as Food[]).map((f) => (
                  <button key={f} onClick={() => onFeed(f)}>
                    {FOODS[f].label}
                  </button>
                ))}
                <button className="ghost" onClick={() => setFeeding(false)} aria-label="Close food menu">
                  ✕
                </button>
              </div>
            ) : (
              <div className="action-row">
                <button onClick={() => setFeeding(true)}>Feed</button>
                <button onClick={onStory}>Story</button>
                <button onClick={onWalk}>Walk</button>
                <button onClick={onBed}>{pet.asleep ? 'Wake' : 'Tuck in'}</button>
              </div>
            )}
          </>
        )}
      </section>

      <Finds inventory={pet.inventory} />

      {import.meta.env.DEV && <DevPanel skip={game.skip} reset={game.reset} />}
    </div>
  )
}

function describeFinds(items: ItemKind[]): string {
  return items.map((k) => `${ITEMS[k].icon} ${ITEMS[k].label.toLowerCase()}`).join(', ')
}

function Meters({ pet, dim }: { pet: Pet; dim: boolean }) {
  return (
    <ul className={`meters ${dim ? 'dim' : ''}`}>
      {(Object.keys(NEED_LABELS) as NeedKey[]).map((k) => {
        const v = Math.round(pet.needs[k])
        const level = v < 30 ? 'low' : v < 50 ? 'mid' : 'ok'
        return (
          <li key={k}>
            <span className="meter-label">
              <span aria-hidden>{NEED_LABELS[k].icon}</span> {NEED_LABELS[k].label}
            </span>
            <span className="meter" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={NEED_LABELS[k].label}>
              <span className={`meter-fill ${level}`} style={{ width: `${v}%` }} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Finds({ inventory }: { inventory: Pet['inventory'] }) {
  const entries = (Object.entries(inventory) as [ItemKind, number][]).filter(([, n]) => n > 0)
  return (
    <section className="finds">
      <h2>Collection</h2>
      {entries.length === 0 ? (
        <p className="hint">Nothing yet. Take it for a walk.</p>
      ) : (
        <ul>
          {entries.map(([k, n]) => (
            <li key={k} title={ITEMS[k].label}>
              <span aria-hidden>{ITEMS[k].icon}</span> {ITEMS[k].label} <b>×{n}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DevPanel({ skip, reset }: { skip: (ms: number) => void; reset: () => void }) {
  return (
    <details className="dev">
      <summary>Dev: time travel</summary>
      <div className="dev-row">
        <button onClick={() => skip(HOUR)}>+1h</button>
        <button onClick={() => skip(6 * HOUR)}>+6h</button>
        <button onClick={() => skip(DAY)}>+1 day</button>
        <button onClick={() => skip(4 * DAY)}>+4 days</button>
        <button
          className="ghost"
          onClick={() => {
            if (confirm('Start over with a new Mossling?')) reset()
          }}
        >
          New Mossling
        </button>
      </div>
    </details>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import {
  BOND_LEVELS,
  COLLECTIBLES,
  DAY,
  DESTINATION_INFO,
  DESTINATIONS,
  FOOD_KINDS,
  FOODS,
  HOUR,
  ITEMS,
  PANTRY_ITEMS,
  STORIES,
  ageInDays,
  bondLevel,
  collectFinds,
  dayIndex,
  feed,
  findMossling,
  give,
  hug,
  isNight,
  moodOf,
  preferencesOf,
  seasonAt,
  setHemisphere,
  startWalk,
  storyCards,
  tellStory,
  tuckIn,
  wake,
  walkBlocker,
  weatherAt,
  type ActionResult,
  type Collectible,
  type Destination,
  type Food,
  type ItemKind,
  type Mood,
  type NeedKey,
  type Pet,
} from '../core'
import { Creature, type Face } from './Creature'
import { MoundCreature } from './MoundCreature'
import { careFor } from './devCare'
import {
  DESTINATION_LABELS,
  FOOD_LABELS,
  FOOD_LINES,
  FORM_LABELS,
  HIGHLIGHT_LINES,
  MOOD_LINES,
  REFUSAL_LINES,
  SEASON_ICONS,
  SEASON_LABELS,
  STAGE_LABELS,
  WEATHER_ICONS,
  WEATHER_LABELS,
  journalText,
  pick,
  wishText,
  withName,
} from './lines'
import { Scene } from './Scene'
import { useGame } from './useGame'

type Reaction = { text: string; happy: boolean; until: number }
type Menu = 'feed' | 'story' | 'walk' | null
type Look = 'troll' | 'mound'

const REACTION_MS = 4500
const LOOK_KEY = 'mossling.look'
const TRAIL = [
  { left: '18%', top: '78%' },
  { left: '46%', top: '62%' },
  { left: '74%', top: '80%' },
]

const NEED_LABELS: Record<NeedKey, { label: string; icon: string }> = {
  fullness: { label: 'Full', icon: '🥣' },
  warmth: { label: 'Warm', icon: '🔥' },
  rest: { label: 'Rested', icon: '🌙' },
  companionship: { label: 'Loved', icon: '🤍' },
}

const MOOD_FACE: Partial<Record<Mood, Face>> = {
  content: 'content',
  delighted: 'delighted',
  restless: 'restless',
  hungry: 'hungry',
  cold: 'cold',
  sleepy: 'sleepy',
  lonely: 'lonely',
  sniffly: 'sniffly',
  asleep: 'asleep',
  atDoor: 'happy',
}

const clockTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const minutes = (ms: number) => (ms >= HOUR ? `${ms / HOUR} h` : `${ms / 60_000} min`)

function readLook(): Look {
  try {
    return localStorage.getItem(LOOK_KEY) === 'mound' ? 'mound' : 'troll'
  } catch {
    return 'troll'
  }
}

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
  const [menu, setMenu] = useState<Menu>(null)
  const [trailStep, setTrailStep] = useState(0)
  const [look, setLook] = useState<Look>(readLook)

  useEffect(() => {
    if (!reaction) return
    const id = setTimeout(() => setReaction(null), Math.max(0, reaction.until - Date.now()))
    return () => clearTimeout(id)
  }, [reaction])

  const mood = moodOf(pet, now)
  const night = isNight(now, pet.hemisphere)
  const season = seasonAt(now, pet.hemisphere)
  const weather = weatherAt(now, pet.hemisphere)
  const hearts = bondLevel(pet.bond)
  const showReaction = reaction !== null
  const face: Face | null =
    showReaction && reaction.happy && mood !== 'asleep' && mood !== 'delighted' ? 'happy' : (MOOD_FACE[mood] ?? null)
  const CreatureArt = look === 'mound' ? MoundCreature : Creature

  const say = (text: string, happy: boolean) => setReaction({ text, happy, until: Date.now() + REACTION_MS })

  const run = (fn: (p: Pet, t: number) => ActionResult, success: (r: Extract<ActionResult, { ok: true }>) => string) => {
    const r = act(fn)
    if (!r) return
    setMenu(null)
    if (r.ok) say([success(r), ...r.highlights.map((h) => HIGHLIGHT_LINES[h])].join(' '), true)
    else say(REFUSAL_LINES[r.refusal], false)
  }

  const onFeed = (food: Food) => run((p, t) => feed(p, food, t), () => FOOD_LINES[food])
  const onHug = () => run(hug, () => `You give ${pet.name} a warm hug. It squeezes back.`)
  const onStory = (id: number) =>
    run(
      (p, t) => tellStory(p, id, t),
      (r) => `You tell the tale of ${STORIES[id]}. ${r.pet.asleep ? `By the end, ${pet.name} is fast asleep.` : `${pet.name} listens, eyes wide.`}`,
    )
  const onWalk = (d: Destination) =>
    run(
      (p, t) => startWalk(p, d, t),
      () => `${pet.name} trundles off to the ${DESTINATION_LABELS[d]}. Back in about ${minutes(DESTINATION_INFO[d].duration)}.`,
    )
  const onCollect = () => run(collectFinds, (r) => `${pet.name} proudly hands you: ${describe(r.found ?? [])}.`)
  const onBed = () =>
    run(pet.asleep ? wake : tuckIn, () => (pet.asleep ? `${pet.name} blinks awake.` : `You tuck ${pet.name} in under a leaf blanket.`))
  const onGive = (item: Collectible) => run((p, t) => give(p, item, t), () => `You give ${pet.name} a ${ITEMS[item].label.toLowerCase()}. It turns it over and over.`)
  const onSpore = () => {
    if (trailStep < TRAIL.length - 1) return setTrailStep(trailStep + 1)
    setTrailStep(0)
    run(findMossling, () => `You find ${pet.name} curled up under a fern. It sniffles, then hugs your finger. It found you a glowcap!`)
  }

  const bubble = showReaction ? reaction.text : withName(pet.name, pick(MOOD_LINES[mood], now))
  const busy = mood === 'away' || mood === 'walking' || mood === 'atDoor'
  const today = dayIndex(now)
  const wish = pet.wish && pet.wish.day === today ? pet.wish : null
  const title = [STAGE_LABELS[pet.stage], pet.form && FORM_LABELS[pet.form]].filter(Boolean).join(' ')

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{pet.name}</h1>
          <span className="sub">
            Day {ageInDays(pet.bornAt, now) + 1} · {title}
          </span>
        </div>
        <div className="top-right">
          <span className="time">{clockTime(now)}</span>
          <span className="sub" title={`${SEASON_LABELS[season]}, ${WEATHER_LABELS[weather].toLowerCase()}`}>
            {SEASON_ICONS[season]} {SEASON_LABELS[season]} · {WEATHER_ICONS[weather]}
          </span>
        </div>
      </header>

      <Scene now={now} night={night} season={season} weather={weather} showDoorOpen={mood === 'atDoor' || mood === 'walking'}>
        {face && (
          <div className={`creature-spot stage-${pet.stage} ${mood === 'atDoor' ? 'at-door' : ''} ${showReaction && reaction.happy ? 'bounce' : ''}`}>
            <CreatureArt face={face} bundle={mood === 'atDoor'} stage={pet.stage} form={pet.form} />
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
        <div className="bond" aria-label={`Bond ${hearts} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={i <= hearts ? 'on' : ''}>
              ♥
            </span>
          ))}
        </div>
      </Scene>

      <p className={`bubble ${showReaction ? 'reacting' : ''}`} aria-live="polite">
        {bubble}
      </p>

      {wish && mood !== 'away' && (
        <p className={`wish ${wish.done ? 'done' : ''}`}>
          <span aria-hidden>{wish.done ? '✓' : '💭'}</span> Today {pet.name} wishes for {wishText(wish)}.
        </p>
      )}

      <Meters pet={pet} dim={mood === 'away'} />

      <section className="actions">
        {mood === 'away' && <p className="hint">Tap the glowing spores to follow the trail.</p>}
        {mood === 'walking' && pet.activity && (
          <p className="hint">
            At the {DESTINATION_LABELS[pet.activity.destination]}. Back around {clockTime(pet.activity.endsAt)}.
          </p>
        )}
        {mood === 'atDoor' && (
          <button className="primary wide" onClick={onCollect}>
            Collect finds
          </button>
        )}
        {!busy && menu === null && (
          <div className="action-row">
            <button onClick={() => setMenu('feed')}>Feed</button>
            <button onClick={onHug}>Hug</button>
            <button onClick={() => setMenu('story')}>Story</button>
            <button onClick={() => setMenu('walk')}>Walk</button>
            <button onClick={onBed}>{pet.asleep ? 'Wake' : 'Bed'}</button>
          </div>
        )}
        {!busy && menu === 'feed' && (
          <SubMenu onClose={() => setMenu(null)}>
            {FOOD_KINDS.map((f) => {
              const uses = FOODS[f].uses
              const left = uses ? (pet.inventory[uses] ?? 0) : null
              return (
                <button key={f} onClick={() => onFeed(f)} disabled={left === 0}>
                  {FOOD_LABELS[f]}
                  <small>{left === null ? 'always' : `×${left}`}</small>
                </button>
              )
            })}
          </SubMenu>
        )}
        {!busy && menu === 'story' && (
          <SubMenu onClose={() => setMenu(null)}>
            {storyCards(pet.id, today, new Date(now).getHours()).map((id) => (
              <button key={id} className="story-card" onClick={() => onStory(id)}>
                <small>The tale of</small>
                {STORIES[id]}
              </button>
            ))}
          </SubMenu>
        )}
        {!busy && menu === 'walk' && (
          <SubMenu onClose={() => setMenu(null)}>
            {DESTINATIONS.map((d) => {
              const blocker = walkBlocker(pet, d, now)
              const lockedBy = blocker === 'locked' ? `needs ♥${DESTINATION_INFO[d].bondLevel}` : blocker === 'tooYoung' ? 'not for sprouts' : null
              return (
                <button key={d} onClick={() => onWalk(d)} disabled={lockedBy !== null}>
                  {DESTINATION_LABELS[d]}
                  <small>{lockedBy ?? minutes(DESTINATION_INFO[d].duration)}</small>
                </button>
              )
            })}
          </SubMenu>
        )}
      </section>

      <Basket pet={pet} onGive={busy ? undefined : onGive} />

      <Journal pet={pet} onHemisphere={() => game.update((p, t) => setHemisphere(p, p.hemisphere === 'north' ? 'south' : 'north', t))} />

      {import.meta.env.DEV && (
        <DevPanel
          skip={game.skip}
          reset={game.reset}
          care={(days) => game.update((p) => careFor(p, days))}
          look={look}
          switchLook={() => {
            const next = look === 'troll' ? 'mound' : 'troll'
            setLook(next)
            try {
              localStorage.setItem(LOOK_KEY, next)
            } catch {
              // ignore
            }
          }}
        />
      )}
    </div>
  )
}

function describe(items: ItemKind[]): string {
  return items.map((k) => `${ITEMS[k].icon} ${ITEMS[k].label.toLowerCase()}`).join(', ')
}

function SubMenu({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="sub-menu">
      {children}
      <button className="ghost" onClick={onClose}>
        Close
      </button>
    </div>
  )
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

function Basket({ pet, onGive }: { pet: Pet; onGive?: (item: Collectible) => void }) {
  const found = COLLECTIBLES.filter((k) => (pet.inventory[k] ?? 0) > 0)
  return (
    <section className="card basket">
      <h2>Pantry</h2>
      <ul className="chips">
        {PANTRY_ITEMS.map((k) => (
          <li key={k} className={(pet.inventory[k] ?? 0) === 0 ? 'empty' : ''}>
            <span aria-hidden>{ITEMS[k].icon}</span> {ITEMS[k].label} <b>×{pet.inventory[k] ?? 0}</b>
          </li>
        ))}
      </ul>
      <h2>Collection {onGive && found.length > 0 && <small>tap to give as a present</small>}</h2>
      {found.length === 0 ? (
        <p className="muted">Nothing yet. Walks turn things up.</p>
      ) : (
        <ul className="chips">
          {found.map((k) => (
            <li key={k}>
              <button disabled={!onGive} onClick={() => onGive?.(k)} title={`Give a ${ITEMS[k].label.toLowerCase()}`}>
                <span aria-hidden>{ITEMS[k].icon}</span> {ITEMS[k].label} <b>×{pet.inventory[k]}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Journal({ pet, onHemisphere }: { pet: Pet; onHemisphere: () => void }) {
  const prefs = preferencesOf(pet.id)
  const learned = [
    pet.known.favoriteFood && `Loves ${FOOD_LABELS[prefs.favoriteFood].toLowerCase()}`,
    pet.known.dislikedFood && `Can’t stand ${FOOD_LABELS[prefs.dislikedFood].toLowerCase()}`,
    pet.known.favoriteStory && `Favourite story: ${STORIES[prefs.favoriteStory]}`,
    pet.known.favoriteItem && `Treasures every ${ITEMS[prefs.favoriteItem].label.toLowerCase()}`,
  ].filter(Boolean) as string[]
  const nextLevel = BOND_LEVELS[bondLevel(pet.bond) + 1]
  return (
    <details className="card journal">
      <summary>
        <h2>Journal</h2>
      </summary>
      <p className="muted">
        Bond ♥{bondLevel(pet.bond)} · {nextLevel ? `${nextLevel - pet.bond} to the next heart` : 'as close as can be'} · {pet.walks} walks
      </p>
      <h3>Things you’ve learned</h3>
      {learned.length === 0 ? (
        <p className="muted">Nothing yet. Try different foods, stories and presents.</p>
      ) : (
        <ul className="learned">
          {learned.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <h3>Moments</h3>
      <ol className="moments">
        {[...pet.journal].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`}>
            <time>{new Date(e.at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</time>
            {journalText(e, pet.name)}
          </li>
        ))}
      </ol>
      <button className="link" onClick={onHemisphere}>
        Seasons: {pet.hemisphere === 'north' ? 'northern' : 'southern'} hemisphere (switch)
      </button>
    </details>
  )
}

type DevProps = {
  skip: (ms: number) => void
  reset: () => void
  care: (days: number) => void
  look: Look
  switchLook: () => void
}

function DevPanel({ skip, reset, care, look, switchLook }: DevProps) {
  return (
    <details className="dev">
      <summary>Dev: time travel</summary>
      <div className="dev-row">
        <button onClick={() => skip(HOUR)}>+1h</button>
        <button onClick={() => skip(6 * HOUR)}>+6h</button>
        <button onClick={() => skip(DAY)}>+1 day</button>
        <button onClick={() => skip(5 * DAY)}>+5 days (alone)</button>
      </div>
      <div className="dev-row">
        <button onClick={() => care(7)}>+1 week, cared for</button>
        <button onClick={() => care(30)}>+1 month, cared for</button>
        <button onClick={() => care(91)}>+1 season, cared for</button>
      </div>
      <div className="dev-row">
        <button onClick={switchLook}>Look: {look}</button>
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

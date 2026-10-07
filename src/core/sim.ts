import type { ItemKind, JournalKind, Needs, Pet } from './types'
import { NEED_KEYS } from './types'
import { dayIndex, isNight, seasonAt, weatherAt } from './calendar'
import { bondLevel, dominantForm, stageAt } from './growth'
import { rollWish } from './prefs'
import {
  AWAY_STEP,
  BEDTIME_IDLE,
  CHILL_LINE,
  ELDER_DECAY,
  HOMEBODY_WARMTH,
  HOUR,
  JOURNAL_MAX,
  NAP_BELOW,
  NEED_FLOOR,
  NEED_MAX,
  NIGHT_CHILL,
  RATES_ASLEEP,
  RATES_AWAKE,
  RATES_WALKING,
  SEASON_WARMTH,
  SNIFFLES_AFTER_CHILL_HOURS,
  SNIFFLES_HEAL_AFTER,
  SNIFFLES_IMMUNITY,
  SNIFFLES_REST,
  SPROUT_REST,
  STEP,
  TRUSTED_BOND_LEVEL,
  WAKE_AT_REST,
  WALK_WAIT,
  WANDER_AFTER,
  WANDER_AFTER_TRUSTED,
  WARM_AGAIN,
  WEATHER_WARMTH_OUTDOORS,
} from './tuning'

export function clampNeed(v: number): number {
  return Math.min(NEED_MAX, Math.max(NEED_FLOOR, v))
}

/** Deep enough copy that no nested field is shared with the original. */
export function clonePet(p: Pet): Pet {
  return {
    ...p,
    needs: { ...p.needs },
    inventory: { ...p.inventory },
    activity: p.activity ? { ...p.activity, finds: [...p.activity.finds] } : null,
    traits: { ...p.traits },
    sniffles: p.sniffles ? { ...p.sniffles } : null,
    known: { ...p.known },
    wish: p.wish ? { ...p.wish } : null,
    daily: { ...p.daily, favorites: [...p.daily.favorites] },
    journal: [...p.journal],
  }
}

export function addItems(p: Pet, items: ItemKind[]): void {
  for (const item of items) p.inventory[item] = (p.inventory[item] ?? 0) + 1
}

export function addNeeds(p: Pet, delta: Partial<Needs>): void {
  for (const k of NEED_KEYS) {
    if (delta[k] !== undefined) p.needs[k] = clampNeed(p.needs[k] + delta[k])
  }
  if (p.needs.companionship > NEED_FLOOR) p.lonelySince = null
}

export function journal(p: Pet, at: number, kind: JournalKind, detail?: string): void {
  p.journal.push(detail === undefined ? { at, kind } : { at, kind, detail })
  if (p.journal.length > JOURNAL_MAX) p.journal.splice(0, p.journal.length - JOURNAL_MAX)
}

export function addBond(p: Pet, points: number, at: number): void {
  const before = bondLevel(p.bond)
  p.bond += points
  const after = bondLevel(p.bond)
  for (let level = before + 1; level <= after; level++) journal(p, at, 'bond', String(level))
}

/** Better again — by tea or by time — and safe from catching them again for a while. */
export function healSniffles(p: Pet, at: number): void {
  p.sniffles = null
  p.chillHours = 0
  p.immuneUntil = at + SNIFFLES_IMMUNITY
  journal(p, at, 'healed')
}

export type WalkPhase = 'out' | 'atDoor'

export function walkPhase(p: Pet, now: number): WalkPhase | null {
  if (!p.activity) return null
  return now < p.activity.endsAt ? 'out' : 'atDoor'
}

/**
 * Per-hour need rates at `t` — the single place every modifier is applied
 * (season, weather outdoors, night, stage, form, sniffles). Multipliers only
 * ever scale decay, never recovery.
 */
export function needRates(p: Pet, t: number): Needs {
  const out = walkPhase(p, t) === 'out'
  const base = out ? RATES_WALKING : p.asleep ? RATES_ASLEEP : RATES_AWAKE
  const r: Needs = { ...base }
  if (!out && !p.asleep && isNight(t, p.hemisphere)) r.warmth += NIGHT_CHILL

  const decay = (k: keyof Needs, m: number) => {
    if (r[k] < 0) r[k] *= m
  }
  decay('warmth', SEASON_WARMTH[seasonAt(t, p.hemisphere)])
  if (out) decay('warmth', WEATHER_WARMTH_OUTDOORS[weatherAt(t, p.hemisphere)])
  if (p.stage === 'sprout') decay('rest', SPROUT_REST)
  if (p.stage === 'elder') for (const k of NEED_KEYS) decay(k, ELDER_DECAY)
  if (p.form === 'homebody' && !out) decay('warmth', HOMEBODY_WARMTH)
  if (p.sniffles) decay('rest', SNIFFLES_REST)
  return r
}

/** Calendar bookkeeping that runs even while it is away: new day, season, growth. */
export function syncCalendar(p: Pet, t: number): void {
  const season = seasonAt(t, p.hemisphere)
  if (season !== p.season) {
    p.season = season
    journal(p, t, 'season', season)
  }
  if (!p.seenSnow && weatherAt(t, p.hemisphere) === 'snow') {
    p.seenSnow = true
    journal(p, t, 'firstSnow')
  }

  const stage = stageAt(p.bornAt, t)
  if (stage !== p.stage) {
    p.stage = stage
    journal(p, t, 'stage', stage)
    // Personality settles when it becomes young, and again when grown.
    if (stage === 'young' || stage === 'grown') {
      const form = dominantForm(p.traits)
      if (form !== p.form) {
        p.form = form
        journal(p, t, 'form', form)
      }
    }
  }

  // Rolled after growth so a walk wish only names places it can reach today.
  const day = dayIndex(t)
  if (p.daily.day !== day) {
    p.daily = { day, goodDay: false, walkBonds: 0, favorites: [] }
    p.wish = rollWish(p, day)
  }
}

/** Walk left unattended at the door: it goes in by itself with half the finds. */
function resolveEvents(p: Pet, t: number): void {
  if (p.activity && t >= p.activity.endsAt + WALK_WAIT) {
    const finds = p.activity.finds
    addItems(p, finds.slice(0, Math.max(1, Math.floor(finds.length / 2))))
    p.activity = null
  }
}

function step(p: Pet, from: number, to: number): void {
  syncCalendar(p, from)
  if (p.wanderedOffAt !== null) return // needs are frozen while it is away

  const night = isNight(from, p.hemisphere)

  if (p.sniffles && from - p.sniffles.since >= SNIFFLES_HEAL_AFTER) healSniffles(p, from)

  // Sleep transitions happen at the start of the step.
  if (p.asleep) {
    if (!night && (p.asleep === 'night' || p.needs.rest >= WAKE_AT_REST)) p.asleep = null
  } else if (!p.activity) {
    if (night && from - p.lastInteractionAt >= BEDTIME_IDLE) p.asleep = 'night'
    else if (!night && p.needs.rest <= NAP_BELOW) p.asleep = 'tired'
  }

  const rates = needRates(p, from)
  const hours = (to - from) / HOUR
  for (const k of NEED_KEYS) p.needs[k] = clampNeed(p.needs[k] + rates[k] * hours)

  // A long cold spell brings on the sniffles.
  if (p.needs.warmth <= CHILL_LINE) {
    p.chillHours += hours
    if (!p.sniffles && p.chillHours >= SNIFFLES_AFTER_CHILL_HOURS && to >= p.immuneUntil) {
      p.sniffles = { since: to }
      journal(p, to, 'sniffles')
    }
  } else if (p.needs.warmth > WARM_AGAIN) {
    p.chillHours = 0
  }

  if (p.needs.companionship <= NEED_FLOOR) p.lonelySince ??= to
  else p.lonelySince = null

  const patience = bondLevel(p.bond) >= TRUSTED_BOND_LEVEL ? WANDER_AFTER_TRUSTED : WANDER_AFTER
  if (p.lonelySince !== null && to - p.lonelySince >= patience && !p.activity) {
    p.wanderedOffAt = to
    p.asleep = null
    journal(p, to, 'wandered')
  }
}

/** Next scheduled event strictly after `t`, so steps never straddle one. */
function nextEventAfter(p: Pet, t: number): number | null {
  if (!p.activity) return null
  if (t < p.activity.endsAt) return p.activity.endsAt
  return p.activity.endsAt + WALK_WAIT
}

/**
 * Advance the pet from `simulatedTo` to `now`. Pure: returns a new object
 * (or the same one if there is nothing to do, e.g. the clock went backwards).
 */
export function simulate(pet: Pet, now: number): Pet {
  if (now <= pet.simulatedTo) return pet
  const p = clonePet(pet)
  let t = p.simulatedTo
  while (t < now) {
    let end = Math.min(t + (p.wanderedOffAt === null ? STEP : AWAY_STEP), now)
    const next = nextEventAfter(p, t)
    if (next !== null && next > t && next < end) end = next
    step(p, t, end)
    t = end
    resolveEvents(p, t)
  }
  syncCalendar(p, now)
  p.simulatedTo = now
  return p
}

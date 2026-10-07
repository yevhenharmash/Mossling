import type { ItemKind, NeedKey, Needs, Pet } from './types'
import {
  BEDTIME_IDLE,
  HOUR,
  NAP_BELOW,
  NEED_FLOOR,
  NEED_MAX,
  NIGHT_CHILL,
  NIGHT_END,
  NIGHT_START,
  RATES_ASLEEP,
  RATES_AWAKE,
  RATES_WALKING,
  STEP,
  WAKE_AT_REST,
  WALK_WAIT,
  WANDER_AFTER,
} from './tuning'

const NEED_KEYS: NeedKey[] = ['fullness', 'warmth', 'rest', 'companionship']

/** Night by the local clock at timestamp `t`. */
export function isNight(t: number): boolean {
  const h = new Date(t).getHours()
  return h >= NIGHT_START || h < NIGHT_END
}

export function clampNeed(v: number): number {
  return Math.min(NEED_MAX, Math.max(NEED_FLOOR, v))
}

export function clonePet(p: Pet): Pet {
  return {
    ...p,
    needs: { ...p.needs },
    inventory: { ...p.inventory },
    activity: p.activity ? { ...p.activity, finds: [...p.activity.finds] } : null,
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

export type WalkPhase = 'out' | 'atDoor'

export function walkPhase(p: Pet, now: number): WalkPhase | null {
  if (!p.activity) return null
  return now < p.activity.endsAt ? 'out' : 'atDoor'
}

/** Next scheduled event strictly after `t`, so steps never straddle one. */
function nextEventAfter(p: Pet, t: number): number | null {
  if (!p.activity) return null
  if (t < p.activity.endsAt) return p.activity.endsAt
  return p.activity.endsAt + WALK_WAIT
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
  const night = isNight(from)
  const out = walkPhase(p, from) === 'out'

  // Sleep transitions happen at the start of the step.
  if (p.asleep) {
    if (!night && (p.asleep === 'night' || p.needs.rest >= WAKE_AT_REST)) p.asleep = null
  } else if (!p.activity) {
    if (night && from - p.lastInteractionAt >= BEDTIME_IDLE) p.asleep = 'night'
    else if (!night && p.needs.rest <= NAP_BELOW) p.asleep = 'tired'
  }

  const rates = out ? RATES_WALKING : p.asleep ? RATES_ASLEEP : RATES_AWAKE
  const hours = (to - from) / HOUR
  for (const k of NEED_KEYS) {
    let rate = rates[k]
    if (k === 'warmth' && night && !p.asleep && !out) rate += NIGHT_CHILL
    p.needs[k] = clampNeed(p.needs[k] + rate * hours)
  }

  if (p.needs.companionship <= NEED_FLOOR) p.lonelySince ??= to
  else p.lonelySince = null

  if (p.lonelySince !== null && to - p.lonelySince >= WANDER_AFTER && !p.activity) {
    p.wanderedOffAt = to
    p.asleep = null
  }
}

/**
 * Advance the pet from `simulatedTo` to `now`. Pure: returns a new object
 * (or the same one if there is nothing to do, e.g. the clock went backwards).
 */
export function simulate(pet: Pet, now: number): Pet {
  if (now <= pet.simulatedTo) return pet
  const p = clonePet(pet)
  let t = p.simulatedTo
  while (t < now && p.wanderedOffAt === null) {
    let end = Math.min(t + STEP, now)
    const next = nextEventAfter(p, t)
    if (next !== null && next > t && next < end) end = next
    step(p, t, end)
    t = end
    resolveEvents(p, t)
  }
  p.simulatedTo = now
  return p
}

import type { ItemKind, Pet } from './types'
import { addItems, addNeeds, isNight, simulate, walkPhase } from './sim'
import { rollFinds } from './items'
import {
  FOODS,
  FOUND_NEEDS,
  FULL_AT,
  INTERACTION_COMPANIONSHIP,
  STORY_COMPANIONSHIP,
  TUCK_IN_MAX_REST,
  TUCK_IN_WARMTH,
  WALK_COLLECT_COMPANIONSHIP,
  WALK_DURATION,
  WALK_MIN_REST,
  type Food,
} from './tuning'

export type Refusal =
  | 'away'
  | 'notAway'
  | 'walking'
  | 'atDoor'
  | 'asleep'
  | 'awake'
  | 'full'
  | 'notSleepy'
  | 'tooTired'
  | 'tooDark'
  | 'noWalk'

export type ActionResult =
  | { ok: true; pet: Pet; found?: ItemKind[] }
  | { ok: false; pet: Pet; refusal: Refusal }

const refuse = (pet: Pet, refusal: Refusal): ActionResult => ({ ok: false, pet, refusal })

/** Brings the pet up to `now` and checks it is home and free. */
function ready(pet: Pet, now: number): { p: Pet; refusal?: Refusal } {
  const p = simulate(pet, now)
  if (p.wanderedOffAt !== null) return { p, refusal: 'away' }
  const phase = walkPhase(p, now)
  if (phase === 'out') return { p, refusal: 'walking' }
  if (phase === 'atDoor') return { p, refusal: 'atDoor' }
  return { p }
}

/** Every action starts from a fresh copy so callers' state is never mutated. */
function edit(p: Pet, now: number, fn: (p: Pet) => void): Pet {
  const next = { ...p, needs: { ...p.needs }, inventory: { ...p.inventory } }
  fn(next)
  addNeeds(next, { companionship: INTERACTION_COMPANIONSHIP })
  next.lonelySince = null
  next.lastInteractionAt = now
  return next
}

export function createPet(id: string, name: string, now: number): Pet {
  return {
    id,
    name,
    bornAt: now,
    needs: { fullness: 80, warmth: 80, rest: 80, companionship: 80 },
    asleep: null,
    activity: null,
    lastInteractionAt: now,
    lonelySince: null,
    wanderedOffAt: null,
    inventory: {},
    simulatedTo: now,
  }
}

export function feed(pet: Pet, food: Food, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  if (p.needs.fullness > FULL_AT) return refuse(p, 'full')
  const { fullness, warmth } = FOODS[food]
  return { ok: true, pet: edit(p, now, (n) => addNeeds(n, { fullness, warmth })) }
}

export function tellStory(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  return {
    ok: true,
    pet: edit(p, now, (n) => {
      addNeeds(n, { companionship: STORY_COMPANIONSHIP })
      // A bedtime story at night sends it off to sleep.
      if (isNight(now)) n.asleep = 'night'
    }),
  }
}

export function tuckIn(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  if (!isNight(now) && p.needs.rest > TUCK_IN_MAX_REST) return refuse(p, 'notSleepy')
  return {
    ok: true,
    pet: edit(p, now, (n) => {
      addNeeds(n, { warmth: TUCK_IN_WARMTH })
      n.asleep = isNight(now) ? 'night' : 'tucked'
    }),
  }
}

export function wake(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (!p.asleep) return refuse(p, 'awake')
  return { ok: true, pet: edit(p, now, (n) => (n.asleep = null)) }
}

export function startWalk(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  if (isNight(now)) return refuse(p, 'tooDark')
  if (p.needs.rest < WALK_MIN_REST) return refuse(p, 'tooTired')
  return {
    ok: true,
    pet: edit(p, now, (n) => {
      n.activity = { kind: 'walk', startedAt: now, endsAt: now + WALK_DURATION, finds: rollFinds(now, 2, 4) }
    }),
  }
}

export function collectFinds(pet: Pet, now: number): ActionResult {
  const p = simulate(pet, now)
  const phase = walkPhase(p, now)
  if (phase === null) return refuse(p, 'noWalk')
  if (phase === 'out') return refuse(p, 'walking')
  const found = p.activity!.finds
  return {
    ok: true,
    found,
    pet: edit(p, now, (n) => {
      addItems(n, found)
      addNeeds(n, { companionship: WALK_COLLECT_COMPANIONSHIP })
      n.activity = null
    }),
  }
}

/** The player followed the trail and brought it home. Always succeeds when it is away. */
export function findMossling(pet: Pet, now: number): ActionResult {
  const p = simulate(pet, now)
  if (p.wanderedOffAt === null) return refuse(p, 'notAway')
  const found: ItemKind[] = ['glowcap']
  return {
    ok: true,
    found,
    pet: edit(p, now, (n) => {
      n.needs = { ...FOUND_NEEDS }
      n.wanderedOffAt = null
      n.lonelySince = null
      n.asleep = null
      addItems(n, found)
    }),
  }
}

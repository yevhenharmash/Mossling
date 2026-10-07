import type { Destination, Discovery, Food, Hemisphere, ItemKind, Pet, Wish } from './types'
import { COLLECTIBLES } from './types'
import { addBond, addItems, addNeeds, clonePet, healSniffles, journal, simulate, syncCalendar, walkPhase } from './sim'
import { dayIndex, isNight, seasonAt, weatherAt } from './calendar'
import { bondLevel, emptyTraits } from './growth'
import { preferencesOf, rollWish } from './prefs'
import { rollFinds } from './items'
import { hashString } from './random'
import { lowestNeed, CONTENT_FROM } from './mood'
import { STORIES } from './stories'
import {
  BOND,
  BOND_EXTRA_FIND_LEVEL,
  DELIGHT_FOR,
  DESTINATION_INFO,
  FAVORITE_COMPANIONSHIP,
  FOODS,
  FORM_PERKS,
  FOUND_NEEDS,
  FULL_AT,
  GIFT_COMPANIONSHIP,
  HUG,
  INTERACTION_COMPANIONSHIP,
  STARTING_PANTRY,
  STORY_COMPANIONSHIP,
  TRAIT_POINTS,
  TUCK_IN_MAX_REST,
  TUCK_IN_WARMTH,
  WALK_COLLECT_COMPANIONSHIP,
  WISH_COMPANIONSHIP,
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
  | 'noFood'
  | 'dislikes'
  | 'locked'
  | 'tooYoung'
  | 'sniffly'
  | 'noItem'
  | 'notGift'
  | 'noStory'

/** What made this action special, for the UI to celebrate. */
export type Highlight = 'favorite' | 'wish' | 'cured' | 'firstWalk'

export type ActionResult =
  | { ok: true; pet: Pet; found?: ItemKind[]; highlights: Highlight[] }
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

/**
 * Applies a successful interaction on a fresh copy (callers' state is never
 * mutated), then the things every interaction does: a little company, a reset
 * lonely streak, and the once-a-day "good day" bond.
 */
function edit(p: Pet, now: number, fn: (n: Pet, highlights: Highlight[]) => void): ActionResult {
  const n = clonePet(p)
  const highlights: Highlight[] = []
  fn(n, highlights)
  addNeeds(n, { companionship: INTERACTION_COMPANIONSHIP })
  n.lonelySince = null
  n.lastInteractionAt = now
  if (!n.daily.goodDay && lowestNeed(n).value >= CONTENT_FROM) {
    n.daily.goodDay = true
    addBond(n, BOND.goodDay, now)
  }
  return { ok: true, pet: n, highlights }
}

function addTrait(n: Pet, source: keyof typeof TRAIT_POINTS): void {
  const [form, points] = TRAIT_POINTS[source]
  n.traits[form] += points
}

function delight(n: Pet, now: number): void {
  n.delightUntil = now + DELIGHT_FOR
}

function discover(n: Pet, what: Discovery, now: number, detail: string): void {
  if (n.known[what]) return
  n.known[what] = true
  journal(n, now, 'discovered', `${what}:${detail}`)
}

/** A favourite always delights; bond from each favourite kind is capped at once a day. */
function favorite(n: Pet, what: Discovery, now: number, detail: string, highlights: Highlight[]): void {
  discover(n, what, now, detail)
  addNeeds(n, { companionship: FAVORITE_COMPANIONSHIP })
  delight(n, now)
  if (!n.daily.favorites.includes(what)) {
    n.daily.favorites.push(what)
    addBond(n, BOND.favorite, now)
  }
  highlights.push('favorite')
}

function grantWish(n: Pet, now: number, matches: (w: Wish) => boolean, highlights: Highlight[]): void {
  const w = n.wish
  if (!w || w.done || w.day !== dayIndex(now) || !matches(w)) return
  w.done = true
  addNeeds(n, { companionship: WISH_COMPANIONSHIP })
  addBond(n, BOND.wish, now)
  delight(n, now)
  highlights.push('wish')
}

export function createPet(id: string, name: string, now: number, hemisphere: Hemisphere = 'north'): Pet {
  const pet: Pet = {
    id,
    name,
    bornAt: now,
    hemisphere,
    needs: { fullness: 80, warmth: 80, rest: 80, companionship: 80 },
    asleep: null,
    activity: null,
    lastInteractionAt: now,
    lonelySince: null,
    wanderedOffAt: null,
    inventory: { ...STARTING_PANTRY },
    stage: 'sprout',
    form: null,
    traits: emptyTraits(),
    bond: 0,
    sniffles: null,
    immuneUntil: 0,
    chillHours: 0,
    delightUntil: 0,
    known: {},
    wish: null,
    daily: { day: dayIndex(now), goodDay: false, walkBonds: 0, favorites: [] },
    season: seasonAt(now, hemisphere),
    seenSnow: false,
    walks: 0,
    journal: [{ at: now, kind: 'hatched' }],
    simulatedTo: now,
  }
  pet.wish = rollWish(pet, pet.daily.day)
  return pet
}

export function feed(pet: Pet, food: Food, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  const info = FOODS[food]
  if (info.uses && (p.inventory[info.uses] ?? 0) < 1) return refuse(p, 'noFood')
  const prefs = preferencesOf(p.id)
  if (food === prefs.dislikedFood) {
    // Refusing never uses the item up, but you do learn something.
    const n = clonePet(p)
    discover(n, 'dislikedFood', now, food)
    return refuse(n, 'dislikes')
  }
  if (p.needs.fullness > FULL_AT && food !== 'tea') return refuse(p, 'full')
  return edit(p, now, (n, highlights) => {
    if (info.uses) n.inventory[info.uses] = (n.inventory[info.uses] ?? 0) - 1
    const fill = n.form === 'foodie' ? FORM_PERKS.foodieFill : 1
    addNeeds(n, { fullness: info.fullness * fill, warmth: info.warmth, companionship: info.companionship })
    addTrait(n, info.uses ? 'pantryFood' : 'porridge')
    if (food === 'tea' && n.sniffles) {
      healSniffles(n, now)
      highlights.push('cured')
    }
    if (food === prefs.favoriteFood) favorite(n, 'favoriteFood', now, food, highlights)
    grantWish(n, now, (w) => w.kind === 'food' && w.food === food, highlights)
  })
}

export function hug(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  return edit(p, now, (n, highlights) => {
    const m = n.form === 'homebody' ? FORM_PERKS.homebodyHug : 1
    addNeeds(n, { warmth: HUG.warmth * m, companionship: HUG.companionship * m })
    addTrait(n, 'hug')
    grantWish(n, now, (w) => w.kind === 'hug', highlights)
  })
}

export function tellStory(pet: Pet, storyId: number, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  if (!Number.isInteger(storyId) || storyId < 0 || storyId >= STORIES.length) return refuse(p, 'noStory')
  return edit(p, now, (n, highlights) => {
    const m = n.form === 'dreamer' ? FORM_PERKS.dreamerStory : 1
    addNeeds(n, { companionship: STORY_COMPANIONSHIP * m })
    addTrait(n, 'story')
    if (storyId === preferencesOf(n.id).favoriteStory) favorite(n, 'favoriteStory', now, String(storyId), highlights)
    grantWish(n, now, (w) => w.kind === 'story', highlights)
    // A bedtime story at night sends it off to sleep.
    if (isNight(now, n.hemisphere)) n.asleep = 'night'
  })
}

export function tuckIn(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  const night = isNight(now, p.hemisphere)
  if (!night && p.needs.rest > TUCK_IN_MAX_REST) return refuse(p, 'notSleepy')
  return edit(p, now, (n) => {
    addNeeds(n, { warmth: TUCK_IN_WARMTH })
    addTrait(n, 'tuckIn')
    n.asleep = night ? 'night' : 'tucked'
  })
}

export function wake(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (!p.asleep) return refuse(p, 'awake')
  return edit(p, now, (n) => {
    n.asleep = null
  })
}

export function give(pet: Pet, item: ItemKind, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  if (!(COLLECTIBLES as readonly string[]).includes(item)) return refuse(p, 'notGift')
  if ((p.inventory[item] ?? 0) < 1) return refuse(p, 'noItem')
  return edit(p, now, (n, highlights) => {
    n.inventory[item] = (n.inventory[item] ?? 0) - 1
    addNeeds(n, { companionship: GIFT_COMPANIONSHIP })
    if (item === preferencesOf(n.id).favoriteItem) favorite(n, 'favoriteItem', now, item, highlights)
    grantWish(n, now, (w) => w.kind === 'gift', highlights)
  })
}

/** Why a destination can't be chosen right now, or null if it can. */
export function walkBlocker(p: Pet, destination: Destination, now: number): Refusal | null {
  const info = DESTINATION_INFO[destination]
  if (p.stage === 'sprout' && destination !== 'meadow') return 'tooYoung'
  if (bondLevel(p.bond) < info.bondLevel) return 'locked'
  if (p.asleep) return 'asleep'
  if (isNight(now, p.hemisphere)) return 'tooDark'
  if (p.sniffles && destination !== 'meadow') return 'sniffly'
  if (p.needs.rest < info.minRest) return 'tooTired'
  return null
}

export function startWalk(pet: Pet, destination: Destination, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  const blocker = walkBlocker(p, destination, now)
  if (blocker) return refuse(p, blocker)
  return edit(p, now, (n, highlights) => {
    const extra =
      (n.form === 'wanderer' ? FORM_PERKS.wandererExtraFinds : 0) + (bondLevel(n.bond) >= BOND_EXTRA_FIND_LEVEL ? 1 : 0)
    const seed = hashString(n.id) ^ Math.floor(now / 1000)
    n.activity = {
      kind: 'walk',
      destination,
      startedAt: now,
      endsAt: now + DESTINATION_INFO[destination].duration,
      finds: rollFinds(seed, destination, seasonAt(now, n.hemisphere), weatherAt(now, n.hemisphere), extra),
    }
    addTrait(n, 'walk')
    n.walks += 1
    if (n.walks === 1) {
      journal(n, now, 'firstWalk', destination)
      highlights.push('firstWalk')
    }
    grantWish(n, now, (w) => w.kind === 'walk' && w.destination === destination, highlights)
  })
}

export function collectFinds(pet: Pet, now: number): ActionResult {
  const p = simulate(pet, now)
  const phase = walkPhase(p, now)
  if (phase === null) return refuse(p, 'noWalk')
  if (phase === 'out') return refuse(p, 'walking')
  const found = [...p.activity!.finds]
  const result = edit(p, now, (n) => {
    addItems(n, found)
    addNeeds(n, { companionship: WALK_COLLECT_COMPANIONSHIP })
    n.activity = null
    if (n.daily.walkBonds < BOND.walkDailyCap) {
      n.daily.walkBonds += 1
      addBond(n, BOND.walk, now)
    }
  })
  return result.ok ? { ...result, found } : result
}

/** The player followed the trail and brought it home. Always succeeds when it is away. */
export function findMossling(pet: Pet, now: number): ActionResult {
  const p = simulate(pet, now)
  if (p.wanderedOffAt === null) return refuse(p, 'notAway')
  const found: ItemKind[] = ['glowcap']
  const result = edit(p, now, (n) => {
    n.needs = { ...FOUND_NEEDS }
    n.wanderedOffAt = null
    n.lonelySince = null
    n.asleep = null
    n.chillHours = 0
    addItems(n, found)
    journal(n, now, 'found')
  })
  return result.ok ? { ...result, found } : result
}

/** Settings change, not an interaction. Re-anchors the season so it isn't journaled as a change. */
export function setHemisphere(pet: Pet, hemisphere: Hemisphere, now: number): Pet {
  const n = clonePet(simulate(pet, now))
  n.hemisphere = hemisphere
  n.season = seasonAt(now, hemisphere)
  syncCalendar(n, now)
  return n
}


import type { Destination, Discovery, Food, FussWant, Hemisphere, HideSpot, ItemKind, Pet, Wish } from './types'
import { COLLECTIBLES, FUSS_WANTS, HIDE_SPOTS } from './types'
import { addBond, addItems, addNeeds, clonePet, healSniffles, journal, newDaily, simulate, syncCalendar, walkPhase } from './sim'
import { checkCare, emptyCare, hidingSpots } from './care'
import { dayIndex, isNight, seasonAt, weatherAt } from './calendar'
import { bondLevel, emptyTraits } from './growth'
import { preferencesOf, rollWish } from './prefs'
import { rollFinds } from './items'
import { hashString, seededRandom } from './random'
import { lowestNeed, CONTENT_FROM, DISTRESS_BELOW } from './mood'
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
  FUSS_CHANCE,
  FUSS_FOR,
  FUSS_PER_DAY,
  GIFT_COMPANIONSHIP,
  HUG,
  INTERACTION_COMPANIONSHIP,
  MINUTE,
  PLAY,
  PLAY_MAX,
  PLAY_MIN_REST,
  PLAY_ROUNDS,
  PLAY_WIN_AT,
  SETTLE_COMPANIONSHIP,
  STARTING_PANTRY,
  STORY_COMPANIONSHIP,
  TRAIT_POINTS,
  TUCK_IN_MAX_REST,
  TUCK_IN_WARMTH,
  VISIT_GAP,
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
  | 'noMess'
  | 'noCall'
  | 'reallyNeeds'
  | 'noGame'

/** What made this action special, for the UI to celebrate (or gently note). */
export type Highlight = 'favorite' | 'wish' | 'cured' | 'firstWalk' | 'answered' | 'settled' | 'gaveIn' | 'won' | 'fussing'

export type ActionResult =
  | { ok: true; pet: Pet; found?: ItemKind[]; score?: number; highlights: Highlight[] }
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
 * lonely streak, the once-a-day "good day" bond, answering its call, and
 * maybe a fuss.
 */
function edit(p: Pet, now: number, fn: (n: Pet, highlights: Highlight[]) => void): ActionResult {
  const n = clonePet(p)
  const highlights: Highlight[] = []
  if (now - n.lastInteractionAt >= VISIT_GAP) {
    n.visitAt = now
    n.fussRolled = false
  }
  const calling = n.call?.kind === 'need' ? n.call.need : null
  fn(n, highlights)
  addNeeds(n, { companionship: INTERACTION_COMPANIONSHIP })
  n.lonelySince = null
  n.lastInteractionAt = now
  if (!n.daily.goodDay && lowestNeed(n).value >= CONTENT_FROM) {
    n.daily.goodDay = true
    addBond(n, BOND.goodDay, now)
  }
  checkCare(n, now)
  if (calling && n.needs[calling] >= DISTRESS_BELOW) highlights.push('answered')
  if (maybeFuss(n, now)) highlights.push('fussing')
  return { ok: true, pet: n, highlights }
}

/**
 * Once per visit — the first time it is content — it may start fussing for
 * something it doesn't need. Rolled while you're there so you actually see it.
 */
function maybeFuss(n: Pet, now: number): boolean {
  if (n.fussRolled || n.call || n.asleep || n.activity || n.sniffles) return false
  if (n.daily.fusses >= FUSS_PER_DAY || lowestNeed(n).value < CONTENT_FROM) return false
  n.fussRolled = true
  const rand = seededRandom(hashString(n.id) ^ Math.floor(n.visitAt / MINUTE))
  if (rand() >= FUSS_CHANCE) return false
  const wants = FUSS_WANTS.filter((w) => w !== 'walk' || walkBlocker(n, 'meadow', now) === null)
  const want = wants[Math.floor(rand() * wants.length)]
  n.call = { kind: 'fuss', want, since: now, until: now + FUSS_FOR }
  n.daily.fusses += 1
  return true
}

/** Doing exactly what it fussed for teaches it that fussing works. */
function giveIn(n: Pet, want: FussWant, highlights: Highlight[]): void {
  if (n.call?.kind !== 'fuss' || n.call.want !== want) return
  n.care.manners -= 1
  n.call = null
  highlights.push('gaveIn')
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
    coat: null,
    care: emptyCare(),
    call: null,
    missedNeeds: [],
    messes: [],
    messClock: 0,
    visitAt: now,
    // Its very first visit stays calm: no fussing before you know the meters.
    fussRolled: true,
    traits: emptyTraits(),
    bond: 0,
    sniffles: null,
    immuneUntil: 0,
    chillHours: 0,
    delightUntil: 0,
    known: {},
    wish: null,
    daily: newDaily(dayIndex(now)),
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
    if (info.uses) giveIn(n, 'treat', highlights)
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
    giveIn(n, 'walk', highlights)
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

/** Tidy up one mess. Fine while it sleeps — just not while it's away. */
export function tidy(pet: Pet, now: number): ActionResult {
  const p = simulate(pet, now)
  if (p.wanderedOffAt !== null) return refuse(p, 'away')
  if (p.messes.length === 0) return refuse(p, 'noMess')
  if (p.asleep || p.activity) {
    // Quiet tidying: no company for a Mossling that isn't there to see it.
    const n = clonePet(p)
    n.messes.shift()
    return { ok: true, pet: n, highlights: [] }
  }
  return edit(p, now, (n) => {
    n.messes.shift()
  })
}

/**
 * A pat and a gentle "not now". The right answer to a fuss; a real need
 * can't be settled — it is refused so the player learns to check.
 */
export function settle(pet: Pet, now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  if (p.call?.kind === 'need') return refuse(p, 'reallyNeeds')
  if (p.call?.kind !== 'fuss') return refuse(p, 'noCall')
  return edit(p, now, (n, highlights) => {
    n.call = null
    n.fussRolled = true // settled is settled: no fresh fuss straight after
    n.care.manners += 1
    addNeeds(n, { companionship: SETTLE_COMPANIONSHIP })
    highlights.push('settled')
  })
}

/**
 * Hide-and-seek: it hides in one of three spots each round (see `hidingSpots`),
 * and `guesses` are where the player looked. Finding it in most rounds wins.
 */
export function playHideAndSeek(pet: Pet, startedAt: number, guesses: HideSpot[], now: number): ActionResult {
  const { p, refusal } = ready(pet, now)
  if (refusal) return refuse(p, refusal)
  if (p.asleep) return refuse(p, 'asleep')
  if (startedAt > now || now - startedAt > PLAY_MAX) return refuse(p, 'noGame')
  if (guesses.length !== PLAY_ROUNDS || !guesses.every((g) => HIDE_SPOTS.includes(g))) return refuse(p, 'noGame')
  if (p.needs.rest < PLAY_MIN_REST) return refuse(p, 'tooTired')
  const spots = hidingSpots(p.id, startedAt)
  const score = guesses.filter((g, i) => g === spots[i]).length
  const won = score >= PLAY_WIN_AT
  const result = edit(p, now, (n, highlights) => {
    giveIn(n, 'play', highlights)
    addNeeds(n, { companionship: won ? PLAY.win : PLAY.lose, rest: PLAY.rest, fullness: PLAY.fullness })
    addTrait(n, 'play')
    if (won) {
      delight(n, now)
      highlights.push('won')
      if (!n.daily.playWon) {
        n.daily.playWon = true
        addBond(n, BOND.playWin, now)
      }
      const favorite = preferencesOf(n.id).favoriteSpot
      if (guesses.some((g, i) => g === spots[i] && g === favorite)) discover(n, 'favoriteSpot', now, favorite)
    }
    grantWish(n, now, (w) => w.kind === 'play', highlights)
  })
  return result.ok ? { ...result, score } : result
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


import type { Destination, Food, Form, NeedKey, PantryItem, Season, Stage, Weather } from './types'

// All balance numbers live here. Rates are points per hour (needs are 0–100).
// Target pace (DESIGN.md §7): 2–4 check-ins a day keep it out of distress in every season.

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** No need ever drops below this — online or offline. */
export const NEED_FLOOR = 10
export const NEED_MAX = 100

/** Companionship at the floor for this long → it wanders off (longer once it trusts you). */
export const WANDER_AFTER = 3 * DAY
export const WANDER_AFTER_TRUSTED = 4 * DAY
export const TRUSTED_BOND_LEVEL = 4

/** Night is [start, end) in local hours, per season. */
export const NIGHT_HOURS: Record<Season, [number, number]> = {
  winter: [20, 8],
  spring: [22, 6],
  summer: [23, 6],
  autumn: [21, 7],
}

/** Awake at night with no interaction for this long → it goes to bed. */
export const BEDTIME_IDLE = 30 * MINUTE
/** Daytime nap kicks in when rest drops this low. */
export const NAP_BELOW = 15
/** Wakes from a nap / tuck-in once rest is this high (daytime only). */
export const WAKE_AT_REST = 95

/** Simulation step size; also bounded by the next scheduled event. */
export const STEP = 5 * MINUTE
/** Coarser step while it is away (needs are frozen; only the calendar moves). */
export const AWAY_STEP = HOUR

type Rates = Record<NeedKey, number>

export const RATES_AWAKE: Rates = { fullness: -5.5, warmth: -4.5, rest: -4, companionship: -5 }
/** Extra warmth loss per hour when awake at night (before the season multiplier). */
export const NIGHT_CHILL = -4
export const RATES_ASLEEP: Rates = { fullness: -2, warmth: -3, rest: 14, companionship: -1 }
/** Out on a walk: hungrier, a bit more tired, never lonely. */
export const RATES_WALKING: Rates = { fullness: -8, warmth: -4.5, rest: -6, companionship: 0 }

/** Multipliers only ever apply to decay (negative rates). */
export const SEASON_WARMTH: Record<Season, number> = { winter: 1.25, autumn: 1.1, spring: 1, summer: 0.6 }
/** Weather only matters outdoors. */
export const WEATHER_WARMTH_OUTDOORS: Record<Weather, number> = { sunny: 0.9, cloudy: 1, rain: 1.3, fog: 1.1, snow: 1.3 }
export const SPROUT_REST = 1.2
export const ELDER_DECAY = 0.85
export const HOMEBODY_WARMTH = 0.85
export const SNIFFLES_REST = 1.5

/** Weather odds per season (weights). */
export const WEATHER_ODDS: Record<Season, Partial<Record<Weather, number>>> = {
  winter: { snow: 35, cloudy: 30, sunny: 20, fog: 15 },
  spring: { sunny: 35, rain: 30, cloudy: 20, fog: 15 },
  summer: { sunny: 55, rain: 20, cloudy: 20, fog: 5 },
  autumn: { rain: 30, fog: 25, cloudy: 25, sunny: 20 },
}

// Growth: age in days at which each stage begins.
export const STAGE_STARTS_AT_DAY: Record<Stage, number> = { sprout: 0, young: 2, grown: 7, elder: 30 }

// Walks.
export const DESTINATION_INFO: Record<
  Destination,
  { duration: number; bondLevel: number; minRest: number; finds: [number, number] }
> = {
  meadow: { duration: 20 * MINUTE, bondLevel: 0, minRest: 25, finds: [2, 3] },
  stream: { duration: 45 * MINUTE, bondLevel: 1, minRest: 35, finds: [3, 4] },
  oldWoods: { duration: 2 * HOUR, bondLevel: 3, minRest: 50, finds: [4, 6] },
}
/** How long it waits at the door with its finds before going in by itself. */
export const WALK_WAIT = 60 * MINUTE
export const WALK_COLLECT_COMPANIONSHIP = 15

// Food. Porridge is unlimited; the rest use one pantry item.
export const FOODS: Record<Food, { fullness: number; warmth: number; companionship: number; uses: PantryItem | null }> = {
  porridge: { fullness: 30, warmth: 5, companionship: 0, uses: null },
  berries: { fullness: 25, warmth: 0, companionship: 5, uses: 'berries' },
  soup: { fullness: 40, warmth: 15, companionship: 0, uses: 'mushroom' },
  tea: { fullness: 0, warmth: 35, companionship: 0, uses: 'pineNeedles' },
}
export const STARTING_PANTRY: Record<PantryItem, number> = { berries: 3, mushroom: 2, pineNeedles: 3 }
/** Refuses food when this full. */
export const FULL_AT = 95

export const HUG = { warmth: 15, companionship: 10 }
export const STORY_COMPANIONSHIP = 25
export const GIFT_COMPANIONSHIP = 8
export const TUCK_IN_WARMTH = 10
/** Refuses a daytime tuck-in when this rested. */
export const TUCK_IN_MAX_REST = 80
/** Any successful interaction is a little company, and resets the lonely streak. */
export const INTERACTION_COMPANIONSHIP = 5

/** Form perks — only ever positive. */
export const FORM_PERKS = {
  wandererExtraFinds: 1,
  dreamerStory: 1.5,
  foodieFill: 1.25,
  homebodyHug: 1.5,
}
/** Trait points per action, deciding the form. */
export const TRAIT_POINTS: Record<'walk' | 'play' | 'story' | 'pantryFood' | 'porridge' | 'hug' | 'tuckIn', [Form, number]> = {
  walk: ['wanderer', 2],
  play: ['wanderer', 1],
  story: ['dreamer', 2],
  pantryFood: ['foodie', 1.5],
  porridge: ['foodie', 0.5],
  hug: ['homebody', 1],
  tuckIn: ['homebody', 1],
}

// Delight, favourites, wishes, bond.
export const DELIGHT_FOR = 30 * MINUTE
export const FAVORITE_COMPANIONSHIP = 10
export const WISH_COMPANIONSHIP = 10
export const BOND = { wish: 5, favorite: 3, walk: 2, walkDailyCap: 2, goodDay: 2, playWin: 2 }
/** Points needed for each bond level (index = level). */
export const BOND_LEVELS = [0, 12, 35, 70, 120, 190]
export const BOND_EXTRA_FIND_LEVEL = 2

// Sniffles.
export const CHILL_LINE = 20
export const WARM_AGAIN = 40
export const SNIFFLES_AFTER_CHILL_HOURS = 3
export const SNIFFLES_HEAL_AFTER = 24 * HOUR
/** After getting better it can't catch them again for this long. */
export const SNIFFLES_IMMUNITY = 24 * HOUR

// Calls and care (DESIGN.md §6.9). A two-visit day (8:00 and 19:00) must never
// cost a care mistake: only skipped visits do. Tested in pacing.test.ts.
/** A need under the distress line calls you; answer within this long. */
export const CALL_WINDOW = 2 * HOUR
/** A fuss lasts this long, then it forgets about it (no mistake either way). */
export const FUSS_FOR = 20 * MINUTE
/** Chance of a fuss on a visit, once it is content. */
export const FUSS_CHANCE = 0.5
export const FUSS_PER_DAY = 2
/** An interaction after this long without one starts a new visit. */
export const VISIT_GAP = HOUR
/** Settling a fuss: a pat and a gentle "not now". */
export const SETTLE_COMPANIONSHIP = 5

/** One mess per this many hours awake at home; never more than MESS_MAX at once. */
export const MESS_EVERY = 5
export const MESS_MAX = 3
/** A mess left this long is a care mistake (once per mess). */
export const MESS_GRACE = 16 * HOUR

/**
 * Coat when entering a stage, from care in the stage before it: glossy needs
 * few mistakes and some manners; wild comes from many mistakes; otherwise mossy.
 */
export const COAT_RULES: Record<'young' | 'grown', { glossyMaxMistakes: number; glossyMinManners: number; wildFromMistakes: number }> = {
  young: { glossyMaxMistakes: 0, glossyMinManners: 1, wildFromMistakes: 3 },
  grown: { glossyMaxMistakes: 1, glossyMinManners: 3, wildFromMistakes: 6 },
}

// Hide-and-seek.
export const PLAY_ROUNDS = 3
/** Wins with at least this many found. */
export const PLAY_WIN_AT = 2
/** It hides in its favourite spot this often; the rest is split evenly. */
export const FAVORITE_SPOT_CHANCE = 0.6
/** A game must be finished within this long of starting. */
export const PLAY_MAX = 15 * MINUTE
export const PLAY_MIN_REST = 25
export const PLAY = { win: 20, lose: 10, rest: -6, fullness: -4 }

export const FOUND_NEEDS = { fullness: 50, warmth: 50, rest: 70, companionship: 60 }
export const JOURNAL_MAX = 100

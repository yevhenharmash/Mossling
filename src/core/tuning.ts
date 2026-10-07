import type { NeedKey } from './types'

// All balance numbers live here. Rates are points per hour (needs are 0–100).
// Target pace (DESIGN.md §13.4): 2–4 check-ins a day keep it content.

export const HOUR = 60 * 60 * 1000
export const MINUTE = 60 * 1000
export const DAY = 24 * HOUR

/** No need ever drops below this — online or offline. */
export const NEED_FLOOR = 10
export const NEED_MAX = 100

/** Companionship at the floor for this long → it wanders off. */
export const WANDER_AFTER = 3 * DAY

/** Night is [NIGHT_START, NIGHT_END) in local hours. */
export const NIGHT_START = 22
export const NIGHT_END = 7

/** Awake at night with no interaction for this long → it goes to bed. */
export const BEDTIME_IDLE = 30 * MINUTE
/** Daytime nap kicks in when rest drops this low. */
export const NAP_BELOW = 15
/** Wakes from a nap / tuck-in once rest is this high (daytime only). */
export const WAKE_AT_REST = 95

/** Simulation step size; also bounded by the next scheduled event. */
export const STEP = 5 * MINUTE

type Rates = Record<NeedKey, number>

// Tuned so morning + evening visits (~11 h apart) stay out of distress.
export const RATES_AWAKE: Rates = { fullness: -6, warmth: -4.5, rest: -4, companionship: -5 }
/** Extra warmth loss per hour when awake at night. */
export const NIGHT_CHILL = -4
export const RATES_ASLEEP: Rates = { fullness: -2, warmth: -3, rest: 14, companionship: -1 }
/** Out on a walk: hungrier, a bit more tired, never lonely. */
export const RATES_WALKING: Rates = { fullness: -8, warmth: -4.5, rest: -6, companionship: 0 }

export const WALK_DURATION = 20 * MINUTE
/** How long it waits at the door with its finds before going in by itself. */
export const WALK_WAIT = 60 * MINUTE
export const WALK_MIN_REST = 25
export const WALK_COLLECT_COMPANIONSHIP = 15

export const FOODS = {
  berries: { fullness: 30, warmth: 0, label: 'Berries' },
  soup: { fullness: 45, warmth: 10, label: 'Mushroom soup' },
  tea: { fullness: 10, warmth: 30, label: 'Pine tea' },
} as const
export type Food = keyof typeof FOODS

export const STORY_COMPANIONSHIP = 25
/** Any successful interaction is a little company, and resets the lonely streak. */
export const INTERACTION_COMPANIONSHIP = 5
export const TUCK_IN_WARMTH = 10
/** Refuses a daytime tuck-in when this rested. */
export const TUCK_IN_MAX_REST = 80
/** Refuses food when this full. */
export const FULL_AT = 95

/** Needs after being found again following a wander-off. */
export const FOUND_NEEDS = { fullness: 50, warmth: 50, rest: 70, companionship: 60 }

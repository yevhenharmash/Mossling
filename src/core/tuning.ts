// Every balance number lives here. Each one is the original P1's value, or a
// stretched version of it that names the downside it fixes (DESIGN.md §5).

import type { CharacterId, Stage } from './types'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Simulation step. Offline time is replayed in steps of this size. */
export const STEP = 5 * MINUTE

export const MAX_HEARTS = 4
/** It refuses a meal when this full (P1 shakes its head). */
export const MEAL_REFUSE_AT = 3.9
/** P1 had no snack limit but no free lunch either (weight). This replaces weight. */
export const SNACKS_PER_DAY = 4

/** P1: 15 minutes. Stretched so a call can wait until you look at your phone. */
export const CALL_WINDOW = 2 * HOUR
/** Lights can go off this long before bedtime, so an evening visit covers bedtime. */
export const LIGHTS_EARLY = 4 * HOUR
/** A visit starts after this long without you; a fuss can only start on a visit. */
export const VISIT_GAP = HOUR
export const FUSS_CHANCE = 0.4
export const DISCIPLINE_STEP = 25

/** P1: 5 rounds of left/right, 3 wins for +1 happy. */
export const GAME_ROUNDS = 5
export const GAME_WIN_AT = 3

export const MAX_POOPS = 4
/** Awake time between poops. P1: about every 3 h as an adult, more often when young. */
export const POOP_EVERY: Record<Stage, number> = {
  spore: Infinity,
  baby: 45 * MINUTE,
  child: 2.5 * HOUR,
  teen: 3 * HOUR,
  adult: 3.5 * HOUR,
}
/** Awake time with poop lying around before it gets sick. Longer than the longest gap between two daily visits. */
export const POOP_SICK_AFTER = 12 * HOUR

/** P1: one random sickness per stage. Chance per awake hour until it happens. */
export const RANDOM_SICK_PER_HOUR: Record<Stage, number> = {
  spore: 0,
  baby: 0,
  child: 1 / 20,
  teen: 1 / 25,
  adult: 1 / 120,
}

/** Untreated this long, it dies. Longer than a day, so one visit a day can always save it. */
export const SICK_DEATH_AFTER = 36 * HOUR
/** Hunger at zero this long, it starves. */
export const STARVE_DEATH_AFTER = 36 * HOUR
/** How long before death it shows that it's fading. */
export const FADING_WARNING = 12 * HOUR

export const SPORE_HATCHES_AFTER = 5 * MINUTE
/** P1: 65 minutes as Babytchi. */
export const BABY_GROWS_AFTER = 65 * MINUTE
/** P1 ages: teen by 3, adult by 6, the secret form between 8 and 12. */
export const TEEN_AT_AGE = 3
export const ADULT_AT_AGE = 6
export const SECRET_AT_AGE = 10

/**
 * P1 lived ~12 days on average and each care mistake shortened it. Ours: 30 with
 * perfect care, a year less for every 2 care mistakes. One visit a day ends
 * around age 17–21.
 */
export const LIFESPAN = 30
export const MISTAKES_PER_YEAR = 2
export const MIN_LIFESPAN = 8

export const SLEEPOVER_MAX = 3 * DAY
/** Time at home after a sleepover before the next one. */
export const SLEEPOVER_COOLDOWN = DAY

export type CharacterStats = {
  /** Local hours. Never asleep when both are null (spore, baby). */
  wake: number | null
  sleep: number | null
  /** Awake hours for one heart to empty. */
  hungerHours: number
  happyHours: number
  /** Medicine doses per sickness. */
  doses: number
}

/**
 * P1 lost a heart every 45–91 minutes, which needs checking every hour. We keep
 * the order (needier characters stay needier) but compress the range into
 * 2.6–3.15 hours: 4 hearts plus the call window outlast a 12-hour day between
 * two visits, but not the day-and-a-bit between visits made once a day.
 */
export const p1Hours = (p1Minutes: number) => 2.6 + (p1Minutes - 45) / 84

/**
 * Datamined P1 stats (TamaTalk P1/P2 guide). Bedtimes are P1's; wake times are
 * moved to 7 am (P1: 9–11 am) so a morning check before school or work finds it
 * awake. Hoodle keeps a late lie-in (8 am), like P1's Maskutchi.
 */
export const CHARACTER_STATS: Record<CharacterId, CharacterStats> = {
  spore: { wake: null, sleep: null, hungerHours: Infinity, happyHours: Infinity, doses: 1 },
  speck: { wake: null, sleep: null, hungerHours: 0.75, happyHours: 0.75, doses: 1 },
  sprig: { wake: 7, sleep: 20, hungerHours: p1Hours(50), happyHours: p1Hours(60), doses: 2 },
  fernlet: { wake: 7, sleep: 21, hungerHours: p1Hours(75), happyHours: p1Hours(85), doses: 2 },
  burrlet: { wake: 7, sleep: 21, hungerHours: p1Hours(75), happyHours: p1Hours(85), doses: 2 },
  glowcap: { wake: 7, sleep: 22, hungerHours: p1Hours(81), happyHours: p1Hours(91), doses: 1 },
  fernwhisk: { wake: 7, sleep: 22, hungerHours: p1Hours(81), happyHours: p1Hours(91), doses: 1 },
  hoodle: { wake: 8, sleep: 23, hungerHours: p1Hours(55), happyHours: p1Hours(65), doses: 1 },
  puddock: { wake: 7, sleep: 22, hungerHours: p1Hours(60), happyHours: p1Hours(70), doses: 2 },
  slinkweed: { wake: 7, sleep: 22, hungerHours: p1Hours(60), happyHours: p1Hours(70), doses: 3 },
  thistle: { wake: 7, sleep: 22, hungerHours: p1Hours(45), happyHours: p1Hours(50), doses: 2 },
  // Not in the datamined table; uses Mametchi's numbers.
  oldLichen: { wake: 7, sleep: 22, hungerHours: p1Hours(81), happyHours: p1Hours(91), doses: 1 },
}

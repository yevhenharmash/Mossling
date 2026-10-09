import type { Pet } from './types'
import { arrive, canLightsOff, clean, gameSides, lights, meal, medicine, play, scold, snack, snacksLeft, type ActionResult } from './actions'
import { simulate } from './sim'
import { DAY, MEAL_REFUSE_AT } from './tuning'

const FULL = MEAL_REFUSE_AT

function repeat(p: Pet, now: number, cond: (p: Pet) => boolean, action: (p: Pet, now: number) => ActionResult): Pet {
  for (let i = 0; i < 12 && cond(p); i++) {
    const r = action(p, now)
    if (!r.ok) break
    p = r.pet
  }
  return p
}

/**
 * One visit by a perfect player: answers a fuss with a scold, treats sickness,
 * cleans up, fills both meters (snacks while they're safe, then the game, always
 * guessed right) and puts the lights out if bedtime is close. Used by the pacing
 * tests and the dev panel's "cared for" fast-forward.
 */
export function tend(pet: Pet, now: number): Pet {
  let p = arrive(pet, now)
  if (p.died || p.sleepover || p.stage === 'spore') return p
  if (p.call?.kind === 'fuss') p = scold(p, now).pet
  p = repeat(p, now, (p) => p.sick !== null, medicine)
  if (p.poops > 0) p = clean(p, now).pet
  p = repeat(p, now, (p) => p.hunger < FULL, meal)
  p = repeat(p, now, (p) => p.happy < FULL && snacksLeft(p, now) > 0, snack)
  p = repeat(p, now, (p) => p.happy < FULL, (p, t) => play(p, t, gameSides(p.id, t), t))
  if (!p.lightsOff && canLightsOff(p, now)) p = lights(p, now).pet
  return p
}

/** Lives `days` days from `from`, visited at the given local hours each day, then catches up to the end. */
export function liveDays(pet: Pet, from: number, days: number, hours: readonly number[] = [8, 19]): Pet {
  let p = pet
  for (let d = 0; d <= days; d++) {
    for (const h of hours) {
      const visit = new Date(from + d * DAY)
      visit.setHours(h, 0, 0, 0)
      const t = visit.getTime()
      if (t > from && t <= from + days * DAY) p = tend(p, t)
    }
  }
  return simulate(p, from + days * DAY)
}

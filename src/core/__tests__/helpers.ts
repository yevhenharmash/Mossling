import { collectFinds, createPet, DAY, feed, hug, settle, simulate, stageAt, tidy, wake, type Pet, type Season, type Stage } from '../index'

// Tests run with TZ=UTC (see package.json), so local time == UTC.
/** Local timestamp in 2026; month is 1-based. */
export const at = (month: number, day: number, hour = 0, minute = 0) => Date.UTC(2026, month - 1, day, hour, minute)

/** A mid-season date (northern hemisphere) for each season. */
export const SEASON_START: Record<Season, number> = {
  spring: at(4, 6),
  summer: at(7, 6),
  autumn: at(10, 6),
  winter: at(1, 6),
}

export const STAGE_AGE_DAYS: Record<Stage, number> = { sprout: 0, young: 3, grown: 10, elder: 40 }

export const itemCount = (p: Pet) => Object.values(p.inventory).reduce((a, b) => a + (b ?? 0), 0)

/**
 * A pet of the given stage, met at `t` (created then aged by moving its
 * birthday back, so no offline time has to be simulated).
 */
export function petAt(t: number, stage: Stage = 'sprout', id = 'moss-1'): Pet {
  const p = createPet(id, 'Moss', t)
  p.bornAt = t - STAGE_AGE_DAYS[stage] * DAY
  p.stage = stageAt(p.bornAt, t)
  return p
}

function repeat(p: Pet, cond: (p: Pet) => boolean, act: (p: Pet) => ReturnType<typeof hug>): Pet {
  for (let i = 0; i < 12 && cond(p); i++) {
    const r = act(p)
    if (!r.ok) break
    p = r.pet
  }
  return p
}

/**
 * A visit using only the free things: porridge and hugs. It also does the
 * chores a caring player does: tidies every mess and says "not now" to a fuss.
 */
export function basicVisit(pet: Pet, now: number): Pet {
  let p = simulate(pet, now)
  if (p.asleep) p = wake(p, now).pet
  if (p.activity) p = collectFinds(p, now).pet
  p = repeat(p, (p) => p.messes.length > 0, (p) => tidy(p, now))
  p = repeat(p, (p) => p.needs.fullness < 95, (p) => feed(p, 'porridge', now))
  p = repeat(p, (p) => p.needs.warmth < 95 || p.needs.companionship < 90, (p) => hug(p, now))
  if (p.call?.kind === 'fuss') p = settle(p, now).pet
  return p
}

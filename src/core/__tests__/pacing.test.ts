import { describe, expect, it } from 'vitest'
import {
  CALL_WINDOW,
  DAY,
  HOUR,
  MINUTE,
  POOP_SICK_AFTER,
  createPet,
  isFading,
  liveDays,
  simulate,
  tend,
  type CharacterId,
  type Pet,
} from '../index'
import { at, petAs } from './helpers'

// The pacing contract (DESIGN.md §8): what each way of playing leads to.

type Run = { pet: Pet; maxDirty: number; maxStarving: number; forms: CharacterId[] }

/**
 * Plants a spore at `plantAt` (a local hour, 7 by default) and lives `days` days,
 * visited at `hours` (fractional for half hours), checking every 30 minutes.
 */
function run(id: string, days: number, hours: number[], plantAt = 7): Run {
  const start = at(1, 5) + plantAt * HOUR
  let p = tend(createPet(id, 'Moss', start), start + 10 * MINUTE)
  let maxDirty = 0
  let maxStarving = 0
  const forms: CharacterId[] = [p.character]
  for (let t = start + 30 * MINUTE; t <= start + days * DAY && !p.died; t += 30 * MINUTE) {
    const d = new Date(t)
    const visit = hours.includes(d.getHours() + d.getMinutes() / 60)
    if (visit) maxStarving = Math.max(maxStarving, p.starvingFor)
    p = visit ? tend(p, t) : simulate(p, t)
    maxDirty = Math.max(maxDirty, p.dirtyFor)
    if (forms[forms.length - 1] !== p.character) forms.push(p.character)
  }
  return { pet: p, maxDirty, maxStarving, forms }
}

const IDS = ['moss-a', 'moss-b', 'moss-c', 'moss-d', 'moss-e']

describe('two visits a day (8:00 and 19:00)', () => {
  it.each(IDS)('%s: no mistakes, never sick from neglect, Glowcap, dies of old age at 30', (id) => {
    const { pet, maxDirty, maxStarving, forms } = run(id, 40, [8, 19])
    expect(pet.lifeMistakes).toBe(0)
    expect(pet.disciplineMistakes).toBe(0)
    expect(maxDirty).toBeLessThan(POOP_SICK_AFTER)
    // A child may call for food shortly before the evening visit, never long enough to be missed.
    expect(maxStarving).toBeLessThan(CALL_WINDOW)
    expect(forms).toEqual(['speck', 'sprig', 'fernlet', 'glowcap'])
    expect(pet.died?.cause).toBe('oldAge')
    expect(pet.age).toBe(30)
  })
})

describe('two visits a day at other times', () => {
  // Real routines vary; any two visits up to 12 hours apart, the evening one by bedtime, must be enough.
  const routines: [number, number][] = [[7, 19], [8, 20], [9, 18], [7.5, 18.5]]
  it.each(routines)('visits at %s and %s: no mistakes after planting day, Glowcap', (morning, evening) => {
    const { pet, forms } = run('moss-a', 40, [morning, evening], 20.5)
    expect(pet.lifeMistakes).toBe(0)
    expect(forms).toContain('glowcap')
  })

  it('planted in the evening, lights off right away: no mistake on night one', () => {
    const { pet } = run('moss-a', 1, [8, 19], 20.5)
    expect(pet.lifeMistakes).toBe(0)
  })
})

describe('one visit a day', () => {
  it.each(IDS)('%s at 19:00: care mistakes, a lesser form and a short life, but never dies of neglect', (id) => {
    const { pet, forms } = run(id, 40, [19])
    expect(forms).toContain('burrlet')
    expect(forms).not.toContain('glowcap')
    expect(pet.died?.cause).toBe('oldAge')
    expect(pet.age).toBeGreaterThanOrEqual(12)
    expect(pet.age).toBeLessThanOrEqual(24)
  })

  it.each(IDS)('%s at 8:00: the lights are always left on, so mistakes, but never dies of neglect', (id) => {
    const { pet } = run(id, 40, [8])
    expect(pet.lifeMistakes).toBeGreaterThanOrEqual(pet.age)
    expect(pet.died?.cause).toBe('oldAge')
  })

  it('sick just after a visit, it is still alive (and savable) at the next one', () => {
    const t = at(3, 2, 19, 5)
    const p = petAs('glowcap', t, { sick: { dosesLeft: 1, untreatedFor: 0 }, lightsOff: true })
    const next = simulate(p, at(3, 3, 19))
    expect(next.died).toBeNull()
    expect(tend(next, at(3, 3, 19)).sick).toBeNull()
  })
})

describe('no visits', () => {
  it.each(IDS)('%s: dies about two days after the last visit, fading for hours first', (id) => {
    const last = at(3, 2, 19)
    let p = tend(petAs('glowcap', last, { id, stageSickDone: false, poopIn: 3 * HOUR }), last)
    let fadingSince: number | null = null
    let t = last
    while (!p.died && t < last + 5 * DAY) {
      t += HOUR
      p = simulate(p, t)
      if (fadingSince === null && isFading(p)) fadingSince = t
    }
    expect(p.died).not.toBeNull()
    const after = (p.died!.at - last) / HOUR
    expect(after).toBeGreaterThan(40)
    expect(after).toBeLessThan(72)
    expect(fadingSince).not.toBeNull()
    expect(p.died!.at - fadingSince!).toBeGreaterThanOrEqual(11 * HOUR)
  })
})

describe('the dev panel’s fast-forward', () => {
  it('liveDays with two visits a day matches the pacing contract', () => {
    const start = at(1, 5, 7)
    const p = liveDays(tend(createPet('moss-a', 'Moss', start), start + 10 * 60_000), start, 10)
    expect(p.died).toBeNull()
    expect(p.lifeMistakes).toBe(0)
    expect(p.character).toBe('glowcap')
  })
})

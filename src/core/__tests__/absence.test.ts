import { describe, expect, it } from 'vitest'
import { BOND_LEVELS, DAY, NEED_FLOOR, feed, findMossling, moodOf, simulate, type Pet } from '../index'
import { at, basicVisit, petAt } from './helpers'

/** Looked after on the evening of 1 Oct, then left alone. */
const left = (bond = 0): Pet => basicVisit({ ...petAt(at(10, 1, 18), 'young'), bond }, at(10, 1, 19))

describe('wandering off', () => {
  it('is still home after 2 days away', () => {
    expect(simulate(left(), at(10, 3, 19)).wanderedOffAt).toBeNull()
  })

  it('wanders off after ~4 days away, timestamped when it happened', () => {
    const p = simulate(left(), at(10, 5, 23))
    expect(p.wanderedOffAt).not.toBeNull()
    expect(p.wanderedOffAt!).toBeGreaterThan(at(10, 4, 19))
    expect(p.wanderedOffAt!).toBeLessThan(at(10, 5, 23))
    expect(moodOf(p, at(10, 5, 23))).toBe('away')
    expect(p.journal.at(-1)?.kind).toBe('wandered')
  })

  it('waits a day longer once it trusts you (bond ♥4)', () => {
    expect(simulate(left(), at(10, 5, 23)).wanderedOffAt).not.toBeNull()
    expect(simulate(left(BOND_LEVELS[4]), at(10, 5, 23)).wanderedOffAt).toBeNull()
    expect(simulate(left(BOND_LEVELS[4]), at(10, 6, 23)).wanderedOffAt).not.toBeNull()
  })

  it('any interaction resets the lonely streak: feeding once a day is enough to keep it', () => {
    let p = left()
    for (let d = 2; d <= 12; d++) {
      p = simulate(p, at(10, d, 9))
      expect(p.wanderedOffAt, `day ${d}`).toBeNull()
      p = feed(p, 'porridge', at(10, d, 9)).pet
    }
  })
})

describe('time keeps moving while it is away', () => {
  it('found 40 days later: older, the right stage and season, with those events in its journal', () => {
    const p = simulate(left(), at(11, 10, 12))
    expect(p.wanderedOffAt).not.toBeNull()
    expect(p.stage).toBe('elder') // young (3 days old on 1 Oct) + 40 days
    const kinds = p.journal.map((e) => `${e.kind}:${e.detail ?? ''}`)
    expect(kinds).toContain('stage:grown')
    expect(kinds).toContain('stage:elder')
    // Needs stay frozen at whatever they were, never below the floor.
    for (const v of Object.values(p.needs)) expect(v).toBeGreaterThanOrEqual(NEED_FLOOR)

    const back = findMossling(p, at(11, 10, 12))
    expect(back.ok).toBe(true)
    expect(back.pet.wanderedOffAt).toBeNull()
    expect(back.pet.inventory.glowcap).toBe(1)
    expect(back.pet.journal.at(-1)?.kind).toBe('found')
  })

  it('records a new season that began while it was away', () => {
    const p = simulate(left(), at(12, 3, 12))
    expect(p.journal.some((e) => e.kind === 'season' && e.detail === 'winter')).toBe(true)
    expect(p.season).toBe('winter')
  })

  it('a month away never drops any need below the floor', () => {
    const p = simulate(left(), at(10, 31, 12))
    for (const v of Object.values(p.needs)) expect(v).toBeGreaterThanOrEqual(NEED_FLOOR)
  })

  it('ignores the clock going backwards', () => {
    const p = left()
    expect(simulate(p, at(10, 1, 10))).toBe(p)
  })

  it('simulating a whole year offline is fast', () => {
    const p = left()
    const start = performance.now()
    simulate(p, at(10, 1, 19) + 365 * DAY)
    expect(performance.now() - start).toBeLessThan(200)
  })

  it('a year of being looked after daily is fast too', () => {
    let p = left()
    const start = performance.now()
    for (let d = 1; d <= 365; d++) p = basicVisit(simulate(p, at(10, 1, 19) + d * DAY), at(10, 1, 19) + d * DAY)
    expect(performance.now() - start).toBeLessThan(1500)
    expect(p.stage).toBe('elder')
    expect(p.journal.length).toBeLessThanOrEqual(100)
    expect(p.wanderedOffAt).toBeNull()
  }, 10_000)
})

it('step timing does not depend on how often you look (simulating in pieces == at once)', () => {
  const p = left()
  const once = simulate(p, at(10, 2, 15))
  let pieces = p
  for (let t = at(10, 1, 19); t <= at(10, 2, 15); t += 37 * 60_000) pieces = simulate(pieces, t)
  pieces = simulate(pieces, at(10, 2, 15))
  for (const k of ['fullness', 'warmth', 'rest', 'companionship'] as const) {
    expect(pieces.needs[k]).toBeCloseTo(once.needs[k], 0)
  }
  expect(pieces.asleep).toBe(once.asleep)
})

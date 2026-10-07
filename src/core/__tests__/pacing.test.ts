import { describe, expect, it } from 'vitest'
import { DAY, DISTRESS_BELOW, FORMS, HOUR, NEED_FLOOR, SEASONS, STAGES, lowestNeed, moodOf, simulate, type Form, type Pet, type Season, type Stage } from '../index'
import { basicVisit, petAt, SEASON_START } from './helpers'

// DESIGN.md §7: 2–4 visits a day keep every need ≥ 30 at each visit, in every
// season and stage, using only the free things (porridge and hugs).

function runVisits(season: Season, stage: Stage, hours: number[], days: number, form: Form | null = null) {
  const start = SEASON_START[season]
  let p: Pet = { ...petAt(start + 18 * HOUR, stage), form }
  p = basicVisit(p, start + 19 * HOUR)
  const lows: { when: string; value: number; mood: string }[] = []
  for (let d = 1; d <= days; d++) {
    for (const h of hours) {
      const t = start + d * DAY + h * HOUR
      const before = simulate(p, t)
      lows.push({ when: `day ${d} ${h}:00`, value: lowestNeed(before).value, mood: moodOf(before, t) })
      p = basicVisit(before, t)
    }
  }
  return { lows, pet: p }
}

describe.each([...SEASONS])('pacing in %s', (season) => {
  it.each([...STAGES])('two visits a day (8:00, 19:00) keep a %s out of distress', (stage) => {
    const { lows } = runVisits(season, stage, [8, 19], 6)
    for (const l of lows) expect(l.value, `${l.when} (${l.mood})`).toBeGreaterThanOrEqual(DISTRESS_BELOW)
  })

  it('three visits a day keep it content or restless at every visit', () => {
    const { lows } = runVisits(season, 'young', [8, 13, 19], 5)
    for (const l of lows) expect(l.mood, l.when).toMatch(/content|restless|delighted|asleep/)
  })

  it('one visit a day leaves it needy but it never wanders off', () => {
    const { lows, pet } = runVisits(season, 'young', [12], 14)
    expect(pet.wanderedOffAt).toBeNull()
    expect(lows.some((l) => l.value < DISTRESS_BELOW)).toBe(true)
    for (const l of lows) expect(l.value).toBeGreaterThanOrEqual(NEED_FLOOR)
  })
})

describe('pacing worst cases', () => {
  it.each([...FORMS])('winter, sprout, %s: two visits still enough', (form) => {
    const { lows } = runVisits('winter', 'sprout', [8, 19], 6, form)
    for (const l of lows) expect(l.value, l.when).toBeGreaterThanOrEqual(DISTRESS_BELOW)
  })
})

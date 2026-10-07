import { describe, expect, it } from 'vitest'
import {
  collectFinds,
  createPet,
  DAY,
  DISTRESS_BELOW,
  feed,
  findMossling,
  HOUR,
  lowestNeed,
  MINUTE,
  moodOf,
  NEED_FLOOR,
  newSave,
  parseSave,
  RATES_AWAKE,
  simulate,
  startWalk,
  tellStory,
  tuckIn,
  wake,
  WALK_DURATION,
  WALK_WAIT,
  type Pet,
} from './index'

// Tests run with TZ=UTC (see package.json), so local hours == UTC hours.
const at = (day: number, hour: number, minute = 0) => Date.UTC(2026, 9, day, hour, minute)

/** A thoughtful check-in: warm it, feed it, keep it company. */
function visit(pet: Pet, now: number): Pet {
  let p = simulate(pet, now)
  if (p.asleep) p = wake(p, now).pet
  if (p.activity) p = collectFinds(p, now).pet
  const until = (cond: (p: Pet) => boolean, act: (p: Pet) => ReturnType<typeof feed>) => {
    for (let i = 0; i < 5 && cond(p); i++) {
      const r = act(p)
      if (!r.ok) break
      p = r.pet
    }
  }
  until((p) => p.needs.warmth < 85, (p) => feed(p, 'tea', now))
  until((p) => p.needs.fullness < 85, (p) => feed(p, 'berries', now))
  until((p) => p.needs.companionship < 90, (p) => tellStory(p, now))
  return p
}

/** Pet that was just looked after on the evening of day 1. */
function cared(): Pet {
  return visit(createPet('m1', 'Moss', at(1, 18)), at(1, 19))
}

describe('pacing (DESIGN.md §13.4: 2–4 check-ins a day)', () => {
  it('three visits a day keep it out of distress at every visit, for a week', () => {
    let p = cared()
    for (let day = 2; day <= 8; day++) {
      for (const hour of [8, 13, 19]) {
        const before = simulate(p, at(day, hour))
        expect(lowestNeed(before).value, `day ${day} ${hour}:00`).toBeGreaterThanOrEqual(DISTRESS_BELOW)
        expect(moodOf(before, at(day, hour))).toMatch(/content|restless/)
        p = visit(before, at(day, hour))
      }
    }
  })

  it('sleeps through the night and is not distressed in the morning', () => {
    const p = cared()
    expect(simulate(p, at(2, 2)).asleep).toBe('night')
    const morning = simulate(p, at(2, 8))
    expect(morning.asleep).toBeNull()
    expect(morning.needs.rest).toBeGreaterThan(90)
    expect(lowestNeed(morning).value).toBeGreaterThanOrEqual(DISTRESS_BELOW)
  })

  it('two visits a day (morning and evening) keep it out of distress', () => {
    let p = cared()
    for (let day = 2; day <= 8; day++) {
      for (const hour of [8, 19]) {
        const before = simulate(p, at(day, hour))
        expect(lowestNeed(before).value, `day ${day} ${hour}:00`).toBeGreaterThanOrEqual(DISTRESS_BELOW)
        p = visit(before, at(day, hour))
      }
    }
  })

  it('a player who only ever feeds it (no stories) still never loses it', () => {
    let p = cared()
    for (let day = 2; day <= 9; day++) {
      for (const hour of [9, 20]) {
        p = simulate(p, at(day, hour))
        expect(p.wanderedOffAt, `day ${day} ${hour}:00`).toBeNull()
        const r = feed(p, 'berries', at(day, hour))
        p = r.pet
      }
    }
  })

  it('one visit a day leaves it needy but it never wanders off', () => {
    let p = cared()
    let neediestMood = ''
    for (let day = 2; day <= 15; day++) {
      const before = simulate(p, at(day, 12))
      expect(before.wanderedOffAt).toBeNull()
      neediestMood = moodOf(before, at(day, 12))
      p = visit(before, at(day, 12))
    }
    expect(neediestMood).not.toBe('content')
  })
})

describe('absence', () => {
  it('has not wandered off after 2 days away', () => {
    expect(simulate(cared(), at(3, 19)).wanderedOffAt).toBeNull()
  })

  it('wanders off after ~3–4 days away, timestamped when it happened', () => {
    const p = simulate(cared(), at(5, 23))
    expect(p.wanderedOffAt).not.toBeNull()
    expect(p.wanderedOffAt!).toBeLessThan(at(5, 23))
    expect(p.wanderedOffAt!).toBeGreaterThan(at(4, 19))
    expect(moodOf(p, at(5, 23))).toBe('away')
  })

  it('a month away never drops needs below the floor, and finding it brings it home', () => {
    const away = simulate(cared(), at(31, 12))
    for (const v of Object.values(away.needs)) expect(v).toBeGreaterThanOrEqual(NEED_FLOOR)
    expect(feed(away, 'berries', at(31, 12)).ok).toBe(false)

    const r = findMossling(away, at(31, 12))
    expect(r.ok).toBe(true)
    expect(r.pet.wanderedOffAt).toBeNull()
    expect(r.pet.inventory.glowcap).toBe(1)
    expect(moodOf(r.pet, at(31, 12))).toMatch(/content|restless/)
  })

  it('ignores the clock going backwards', () => {
    const p = cared()
    expect(simulate(p, at(1, 10))).toBe(p)
  })
})

describe('walks', () => {
  const morning = () => visit(cared(), at(2, 9))

  it('waits at the door and gives all finds when collected', () => {
    const started = startWalk(morning(), at(2, 10))
    expect(started.ok).toBe(true)
    const finds = started.pet.activity!.finds
    expect(collectFinds(started.pet, at(2, 10, 10)).ok).toBe(false)

    const r = collectFinds(started.pet, at(2, 10) + WALK_DURATION + 5 * MINUTE)
    expect(r.ok).toBe(true)
    const total = Object.values(r.pet.inventory).reduce((a, b) => a + b, 0)
    expect(total).toBe(finds.length)
  })

  it('goes in by itself with half the finds when left at the door, resolved at that moment', () => {
    const started = startWalk(morning(), at(2, 10)).pet
    const c0 = started.needs.companionship
    const later = simulate(started, at(2, 13))
    expect(later.activity).toBeNull()
    const total = Object.values(later.inventory).reduce((a, b) => a + b, 0)
    expect(total).toBe(Math.max(1, Math.floor(started.activity!.finds.length / 2)))
    // Out (no loneliness) 20 min, then 60 min at the door + 100 min inside at the awake rate.
    const lonelyHours = (at(2, 13) - (at(2, 10) + WALK_DURATION)) / HOUR
    expect(later.needs.companionship).toBeCloseTo(c0 + RATES_AWAKE.companionship * lonelyHours, 5)
    expect(WALK_DURATION + WALK_WAIT).toBeLessThan(3 * HOUR)
  })

  it('will not go out at night', () => {
    const p = wake(simulate(cared(), at(1, 23)), at(1, 23)).pet
    expect(p.asleep).toBeNull()
    expect(startWalk(p, at(1, 23))).toMatchObject({ ok: false, refusal: 'tooDark' })
  })
})

describe('actions', () => {
  it('a bedtime story at night puts it to sleep', () => {
    // Played with at 21:50, so it is still up at 22:05.
    const p = tellStory(cared(), at(1, 21, 50)).pet
    expect(simulate(p, at(1, 22, 5)).asleep).toBeNull()
    const r = tellStory(p, at(1, 22, 5))
    expect(r.ok && r.pet.asleep).toBe('night')
  })

  it('refuses a daytime tuck-in when well rested', () => {
    const p = visit(cared(), at(2, 9))
    expect(tuckIn(p, at(2, 9))).toMatchObject({ ok: false, refusal: 'notSleepy' })
  })

  it('does not mutate the pet passed in', () => {
    const p = cared()
    const snapshot = JSON.stringify(p)
    feed(p, 'soup', at(2, 9))
    simulate(p, at(4, 9))
    expect(JSON.stringify(p)).toBe(snapshot)
  })

  it('stays put a full day when fed nothing: no need ever below the floor', () => {
    const p = simulate(createPet('x', 'X', at(1, 9)), at(1, 9) + DAY)
    for (const v of Object.values(p.needs)) expect(v).toBeGreaterThanOrEqual(NEED_FLOOR)
  })
})

describe('save', () => {
  it('round-trips and rejects garbage', () => {
    const save = newSave(cared())
    expect(parseSave(JSON.stringify(save))).toEqual(save)
    expect(parseSave(null)).toBeNull()
    expect(parseSave('{nope')).toBeNull()
    expect(parseSave(JSON.stringify({ version: 99, pets: [] }))).toBeNull()
  })
})

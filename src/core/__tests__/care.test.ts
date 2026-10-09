import { describe, expect, it } from 'vitest'
import {
  CALL_WINDOW,
  CHARACTER_STATS,
  DAY,
  HOUR,
  MINUTE,
  POOP_SICK_AFTER,
  SICK_DEATH_AFTER,
  SNACKS_PER_DAY,
  STARVE_DEATH_AFTER,
  arrive,
  clean,
  createPet,
  deathRisk,
  endSleepover,
  gameSides,
  hearts,
  isFading,
  lifespan,
  lights,
  meal,
  medicine,
  play,
  scold,
  simulate,
  snack,
  startSleepover,
  type Pet,
} from '../index'
import { at, petAs } from './helpers'

const ok = (r: { ok: boolean; pet: Pet }) => {
  expect(r.ok).toBe(true)
  return r.pet
}

describe('meters and calls', () => {
  it('a heart empties in the character’s hours, and it calls when a meter hits zero', () => {
    const t = at(3, 2, 8)
    const hours = CHARACTER_STATS.glowcap.hungerHours
    const p = simulate(petAs('glowcap', t, { hunger: 1 }), t + hours * HOUR + MINUTE * 5)
    expect(p.hunger).toBe(0)
    expect(p.call?.kind).toBe('hunger')
  })

  it('an unanswered call is a care mistake after the window, and that meter won’t call again until refilled', () => {
    const t = at(3, 2, 8)
    const p = simulate(petAs('glowcap', t, { hunger: 0.01 }), t + CALL_WINDOW + 15 * MINUTE)
    expect(p.careMistakes).toBe(1)
    expect(p.lifeMistakes).toBe(1)
    expect(p.call).toBeNull()
    expect(simulate(p, t + 4 * HOUR).careMistakes).toBe(1)
  })

  it('feeding answers a hunger call in time', () => {
    const t = at(3, 2, 8)
    const calling = simulate(petAs('glowcap', t, { hunger: 0.01 }), t + 30 * MINUTE)
    const fed = ok(meal(calling, t + HOUR))
    expect(fed.call).toBeNull()
    expect(simulate(fed, t + 4 * HOUR).careMistakes).toBe(0)
  })

  it('a meal adds one heart, and it refuses when full', () => {
    const t = at(3, 2, 8)
    expect(hearts(ok(meal(petAs('glowcap', t, { hunger: 1 }), t)).hunger)).toBe(2)
    expect(meal(petAs('glowcap', t), t)).toMatchObject({ ok: false, refusal: 'full' })
  })

  it('snacks give a heart of happy; one too many in a day gives a tummy ache', () => {
    const t = at(3, 2, 8)
    let p = petAs('glowcap', t, { happy: 0 })
    for (let i = 0; i < SNACKS_PER_DAY; i++) p = ok(snack(p, t))
    expect(p.happy).toBe(4)
    expect(p.sick).toBeNull()
    const r = snack(p, t)
    expect(r.ok && r.notes).toContain('tummyAche')
    expect(r.pet.sick).not.toBeNull()
    // A new day, a new allowance.
    expect(ok(snack({ ...p, sick: null }, t + DAY)).sick).toBeNull()
  })

  it('the game gives +1 happy for 3 of 5 right, nothing otherwise', () => {
    const t = at(3, 2, 8)
    const p = petAs('glowcap', t, { happy: 1 })
    const sides = gameSides(p.id, t)
    expect(hearts(ok(play(p, t, sides, t)).happy)).toBe(2)
    const wrong = sides.map((s) => (s === 'left' ? 'right' : 'left'))
    expect(hearts(ok(play(p, t, wrong, t)).happy)).toBe(1)
  })
})

describe('discipline', () => {
  it('a new visit can bring a fuss, and scolding it gives +25%', () => {
    const t = at(3, 2, 8)
    // Find a visit time at which it fusses (it's a 40% roll).
    let fussing: Pet | null = null
    for (let h = 0; h < 40 && !fussing; h++) {
      const p = arrive(petAs('glowcap', t, { discipline: 0, lastSeenAt: t - 2 * HOUR }), t + h * MINUTE)
      if (p.call?.kind === 'fuss') fussing = p
    }
    expect(fussing).not.toBeNull()
    const now = fussing!.lastSeenAt
    expect(meal({ ...fussing!, hunger: 1 }, now)).toMatchObject({ ok: false, refusal: 'fussing' })
    const scolded = ok(scold(fussing!, now))
    expect(scolded.discipline).toBe(25)
    expect(scolded.call).toBeNull()
  })

  it('ignoring a fuss is a discipline mistake, not a care mistake', () => {
    const t = at(3, 2, 8)
    const p = simulate(petAs('glowcap', t, { call: { kind: 'fuss', since: t, until: t + CALL_WINDOW } }), t + 3 * HOUR)
    expect(p.disciplineMistakes).toBe(1)
    expect(p.careMistakes).toBe(0)
  })

  it('no fuss once discipline is full, or without a break between visits', () => {
    const t = at(3, 2, 8)
    for (let m = 0; m < 60; m++) {
      expect(arrive(petAs('glowcap', t), t + m * MINUTE).call).toBeNull()
      expect(arrive(petAs('glowcap', t, { discipline: 0 }), t + m * MINUTE).call).toBeNull()
    }
  })

  it('scolding for nothing costs a heart of happy', () => {
    const t = at(3, 2, 8)
    const r = scold(petAs('glowcap', t), t)
    expect(r.ok && r.notes).toContain('unfair')
    expect(hearts(r.pet.happy)).toBe(3)
  })
})

describe('bedtime', () => {
  it('falling asleep with the lights on calls; leaving them on is a care mistake', () => {
    const t = at(3, 2, 21, 30)
    const p = simulate(petAs('glowcap', t), at(3, 2, 22, 10))
    expect(p.asleep).toBe(true)
    expect(p.call?.kind).toBe('lights')
    expect(simulate(p, at(3, 3, 0, 30)).careMistakes).toBe(1)
    expect(simulate(ok(lights(p, at(3, 2, 23))), at(3, 3, 0, 30)).careMistakes).toBe(0)
  })

  it('the lights can go off up to 4 hours before bedtime, so an evening visit covers it', () => {
    expect(lights(petAs('glowcap', at(3, 2, 17)), at(3, 2, 17))).toMatchObject({ ok: false, refusal: 'notBedtime' })
    const off = ok(lights(petAs('glowcap', at(3, 2, 18)), at(3, 2, 18)))
    const night = simulate(off, at(3, 2, 23))
    expect(night.asleep).toBe(true)
    expect(night.call).toBeNull()
  })

  it('meters don’t drop while asleep, and lights come back on when it wakes', () => {
    const t = at(3, 2, 22, 30)
    const p = simulate(petAs('glowcap', t, { asleep: true, lightsOff: true }), at(3, 3, 6, 55))
    expect(p.hunger).toBe(4)
    const morning = simulate(p, at(3, 3, 7, 30))
    expect(morning.asleep).toBe(false)
    expect(morning.lightsOff).toBe(false)
  })
})

describe('poop and sickness', () => {
  it('poop left lying around for 12 awake hours makes it sick', () => {
    const t = at(3, 2, 8)
    const dirty = petAs('glowcap', t, { poops: 1, hunger: 99, happy: 99 })
    expect(simulate(dirty, t + POOP_SICK_AFTER - HOUR).sick).toBeNull()
    expect(simulate(dirty, t + POOP_SICK_AFTER + 5 * MINUTE).sick).not.toBeNull()
    expect(ok(clean(dirty, t)).poops).toBe(0)
  })

  it('medicine takes the character’s number of doses', () => {
    const t = at(3, 2, 8)
    const p = petAs('slinkweed', t, { sick: { dosesLeft: CHARACTER_STATS.slinkweed.doses, untreatedFor: 0 } })
    const once = ok(medicine(p, t))
    expect(once.sick).not.toBeNull()
    const cured = medicine(ok(medicine(once, t)), t)
    expect(cured.ok && cured.notes).toContain('cured')
    expect(cured.pet.sick).toBeNull()
    expect(medicine(cured.pet, t)).toMatchObject({ ok: false, refusal: 'notSick' })
  })

  it('most get sick once at random during a stage', () => {
    const t = at(3, 2, 8)
    const teens = Array.from({ length: 20 }, (_, i) => petAs('fernlet', t, { id: `moss-${i}`, age: 0, stageSickDone: false, hunger: 99, happy: 99 }))
    const sickOnce = teens.map((p) => simulate(p, t + 5 * DAY)).filter((p) => p.stage === 'teen' && p.stageSickDone)
    expect(sickOnce.length).toBeGreaterThanOrEqual(16)
  })
})

describe('death', () => {
  it('untreated sickness kills after 36 hours, fading for the last 12', () => {
    const t = at(3, 2, 8)
    const p = petAs('glowcap', t, { hunger: 99, happy: 99, sick: { dosesLeft: 1, untreatedFor: 0 } })
    expect(isFading(simulate(p, t + SICK_DEATH_AFTER - 13 * HOUR))).toBe(false)
    const fading = simulate(p, t + SICK_DEATH_AFTER - 11 * HOUR)
    expect(isFading(fading)).toBe(true)
    expect(deathRisk(fading)?.cause).toBe('sickness')
    expect(fading.died).toBeNull()
    expect(simulate(p, t + SICK_DEATH_AFTER + 5 * MINUTE).died?.cause).toBe('sickness')
  })

  it('an unhatched spore is in no danger, though its hearts start empty', () => {
    const t = at(3, 2, 8)
    expect(deathRisk(createPet('moss-1', 'Moss', t))).toBeNull()
  })

  it('hunger at zero for 36 hours starves it', () => {
    const t = at(3, 2, 8)
    const p = petAs('glowcap', t, { hunger: 0, happy: 99 })
    expect(simulate(p, t + STARVE_DEATH_AFTER - HOUR).died).toBeNull()
    expect(simulate(p, t + STARVE_DEATH_AFTER + 5 * MINUTE).died?.cause).toBe('starvation')
  })

  it('it dies of old age in its sleep, a year sooner for every 2 care mistakes', () => {
    expect(lifespan({ lifeMistakes: 0 })).toBe(30)
    expect(lifespan({ lifeMistakes: 5 })).toBe(28)
    expect(lifespan({ lifeMistakes: 10 })).toBe(25)
    expect(lifespan({ lifeMistakes: 99 })).toBe(8)
    const t = at(3, 2, 23)
    const p = petAs('glowcap', t, { age: 24, lifeMistakes: 10, asleep: true, lightsOff: true })
    const dead = simulate(p, at(3, 3, 8))
    expect(dead.died?.cause).toBe('oldAge')
    expect(dead.age).toBe(25)
  })
})

describe('sleepover (pause)', () => {
  it('time stands still while it’s away, and it can be brought home early', () => {
    const t = at(3, 2, 19)
    const away = ok(startSleepover(petAs('glowcap', t, { hunger: 1 }), t))
    const later = simulate(away, t + 2 * DAY)
    expect(later.hunger).toBe(1)
    expect(later.age).toBe(away.age)
    const home = ok(endSleepover(later, t + 2 * DAY))
    expect(home.sleepover).toBeNull()
    expect(home.hunger).toBe(1)
  })

  it('it comes home by itself after 3 days, and can’t go again for a day', () => {
    const t = at(3, 2, 19)
    const away = ok(startSleepover(petAs('glowcap', t), t))
    const back = simulate(away, t + 3 * DAY + HOUR)
    expect(back.sleepover).toBeNull()
    expect(back.hunger).toBeLessThan(4)
    expect(startSleepover(back, t + 3 * DAY + HOUR)).toMatchObject({ ok: false, refusal: 'tooSoon' })
  })

  it('not while sick or calling', () => {
    const t = at(3, 2, 19)
    expect(startSleepover(petAs('glowcap', t, { sick: { dosesLeft: 1, untreatedFor: 0 } }), t)).toMatchObject({ ok: false, refusal: 'sick' })
    expect(startSleepover(petAs('glowcap', t, { hunger: 0 }), t + MINUTE)).toMatchObject({ ok: false, refusal: 'calling' })
  })
})

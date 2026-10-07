import { describe, expect, it } from 'vitest'
import {
  DAY,
  HOUR,
  NEED_FLOOR,
  STAGE_STARTS_AT_DAY,
  STAGES,
  ageInDays,
  createPet,
  dominantForm,
  emptyTraits,
  feed,
  findMossling,
  hug,
  needRates,
  simulate,
  stageAt,
  startWalk,
  tellStory,
  collectFinds,
  type Form,
  type Pet,
} from '../index'
import { at, basicVisit } from './helpers'

describe('aging', () => {
  it.each([...STAGES])('%s starts on its day', (stage) => {
    const born = at(3, 1, 9)
    const day = STAGE_STARTS_AT_DAY[stage]
    expect(stageAt(born, born + day * DAY)).toBe(stage)
    if (day > 0) expect(stageAt(born, born + day * DAY - 1)).not.toBe(stage)
  })

  it('opening the app after 10 days passes through each stage, in order, at the right time', () => {
    const born = at(3, 1, 9)
    let p = createPet('m', 'Moss', born)
    p = basicVisit(p, born + HOUR)
    p = simulate(p, born + 10 * DAY)
    expect(p.stage).toBe('grown')
    const stages = p.journal.filter((e) => e.kind === 'stage')
    expect(stages.map((e) => e.detail)).toEqual(['young', 'grown'])
    expect(stages[0].at - born).toBeGreaterThanOrEqual(2 * DAY)
    expect(stages[0].at - born).toBeLessThan(2 * DAY + HOUR)
    expect(p.form).not.toBeNull()
  })

  it('a year-old Mossling is an elder, healthy, and still has a valid state', () => {
    const born = at(1, 1, 9)
    const p = simulate(createPet('m', 'Moss', born), born + 365 * DAY)
    expect(p.stage).toBe('elder')
    expect(ageInDays(p.bornAt, born + 365 * DAY)).toBe(365)
    for (const v of Object.values(p.needs)) expect(v).toBeGreaterThanOrEqual(NEED_FLOOR)
    const found = findMossling(p, born + 365 * DAY)
    expect(found.ok).toBe(true)
    expect(found.pet.stage).toBe('elder')
  })

  it('elders drain slower than the young', () => {
    const t = at(5, 10, 12)
    const young: Pet = { ...createPet('a', 'A', t), stage: 'young' }
    const elder: Pet = { ...createPet('a', 'A', t), stage: 'elder' }
    expect(needRates(elder, t).fullness).toBeGreaterThan(needRates(young, t).fullness)
  })
})

describe('personality', () => {
  it('nobody shaped it → homebody; otherwise the top trait; ties go to list order', () => {
    expect(dominantForm(emptyTraits())).toBe('homebody')
    expect(dominantForm({ ...emptyTraits(), dreamer: 3, foodie: 1 })).toBe('dreamer')
    expect(dominantForm({ wanderer: 2, dreamer: 2, foodie: 0, homebody: 0 })).toBe('wanderer')
  })

  /** Two days of a single play style, then see who it becomes. */
  function raise(style: (p: Pet, t: number) => Pet): Pet {
    const born = at(6, 1, 8)
    let p = createPet('m', 'Moss', born)
    for (let d = 0; d < 2; d++) {
      for (const h of [1, 4, 9]) {
        const t = born + d * DAY + h * HOUR
        p = basicVisit(simulate(p, t), t)
        p = style(p, t)
      }
    }
    return simulate(p, born + 2 * DAY + HOUR)
  }

  const styles: Record<Form, (p: Pet, t: number) => Pet> = {
    wanderer: (p, t) => {
      const out = startWalk(p, 'meadow', t)
      return out.ok ? collectFinds(out.pet, t + HOUR / 2).pet : p
    },
    dreamer: (p, t) => [0, 1, 2].reduce((q) => tellStory(q, 0, t).pet, p),
    foodie: (p, t) => {
      const r = feed(p, 'tea', t)
      return r.ok ? r.pet : [0, 1, 2, 3].reduce((q) => feed({ ...q, needs: { ...q.needs, fullness: 40 } }, 'porridge', t).pet, p)
    },
    homebody: (p, t) => [0, 1, 2, 3].reduce((q) => hug(q, t).pet, p),
  }

  it.each(Object.keys(styles) as Form[])('mostly %s play grows a %s', (form) => {
    // basicVisit itself hugs; the style has to outweigh it, which is the point.
    const p = raise(styles[form])
    expect(p.stage).toBe('young')
    expect(p.form).toBe(form)
    expect(p.journal.some((e) => e.kind === 'form' && e.detail === form)).toBe(true)
  })

  it('the form is looked at again when it is grown', () => {
    const born = at(6, 1, 8)
    let p = createPet('m', 'Moss', born)
    p = simulate(p, born + 3 * DAY)
    expect(p.form).toBe('homebody')
    p = { ...p, traits: { ...p.traits, dreamer: 100 } }
    p = simulate(p, born + 8 * DAY)
    expect(p.stage).toBe('grown')
    expect(p.form).toBe('dreamer')
  })
})

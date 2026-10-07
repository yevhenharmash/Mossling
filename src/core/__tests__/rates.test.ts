import { describe, expect, it } from 'vitest'
import {
  ELDER_DECAY,
  HOMEBODY_WARMTH,
  NIGHT_CHILL,
  RATES_ASLEEP,
  RATES_AWAKE,
  RATES_WALKING,
  SEASON_WARMTH,
  SEASONS,
  SNIFFLES_REST,
  SPROUT_REST,
  WEATHER_WARMTH_OUTDOORS,
  needRates,
  startWalk,
  weatherAt,
  type Pet,
} from '../index'
import { at, petAt, SEASON_START } from './helpers'

const noon = (t: number) => t + 12 * 3600_000

describe('needRates: the one place modifiers combine', () => {
  it.each([...SEASONS])('%s scales warmth decay indoors by its season factor only', (season) => {
    const t = noon(SEASON_START[season])
    const r = needRates(petAt(t, 'young'), t)
    expect(r.warmth).toBeCloseTo(RATES_AWAKE.warmth * SEASON_WARMTH[season])
    expect(r.fullness).toBe(RATES_AWAKE.fullness)
    expect(r.companionship).toBe(RATES_AWAKE.companionship)
  })

  it('night adds a chill when awake, before the season factor', () => {
    const t = at(10, 6, 23)
    expect(needRates(petAt(t, 'young'), t).warmth).toBeCloseTo((RATES_AWAKE.warmth + NIGHT_CHILL) * SEASON_WARMTH.autumn)
  })

  it('weather only matters outdoors', () => {
    const t = noon(SEASON_START.autumn)
    const home = petAt(t, 'young')
    const out = startWalk(home, 'meadow', t).pet
    const w = weatherAt(t, 'north')
    expect(needRates(home, t).warmth).toBeCloseTo(RATES_AWAKE.warmth * SEASON_WARMTH.autumn)
    expect(needRates(out, t + 60_000).warmth).toBeCloseTo(
      RATES_WALKING.warmth * SEASON_WARMTH.autumn * WEATHER_WARMTH_OUTDOORS[w],
    )
  })

  it('sprouts tire faster; elders drain slower; homebodies keep warm; sniffles tire', () => {
    const t = noon(SEASON_START.spring)
    expect(needRates(petAt(t, 'sprout'), t).rest).toBeCloseTo(RATES_AWAKE.rest * SPROUT_REST)
    const elder = needRates(petAt(t, 'elder'), t)
    expect(elder.fullness).toBeCloseTo(RATES_AWAKE.fullness * ELDER_DECAY)
    expect(elder.companionship).toBeCloseTo(RATES_AWAKE.companionship * ELDER_DECAY)
    const homebody: Pet = { ...petAt(t, 'young'), form: 'homebody' }
    expect(needRates(homebody, t).warmth).toBeCloseTo(RATES_AWAKE.warmth * HOMEBODY_WARMTH)
    const sniffly: Pet = { ...petAt(t, 'young'), sniffles: { since: t } }
    expect(needRates(sniffly, t).rest).toBeCloseTo(RATES_AWAKE.rest * SNIFFLES_REST)
  })

  it('modifiers never slow recovery: sleep restores rest at the full rate for everyone', () => {
    const t = noon(SEASON_START.winter)
    for (const stage of ['sprout', 'elder'] as const) {
      const p: Pet = { ...petAt(t, stage), asleep: 'tucked', sniffles: { since: t } }
      expect(needRates(p, t).rest).toBe(RATES_ASLEEP.rest)
    }
  })

  it('perks are never penalties: every form drains at most as fast as no form', () => {
    const t = noon(SEASON_START.winter)
    const base = needRates(petAt(t, 'young'), t)
    for (const form of ['wanderer', 'dreamer', 'foodie', 'homebody'] as const) {
      const r = needRates({ ...petAt(t, 'young'), form }, t)
      for (const k of ['fullness', 'warmth', 'rest', 'companionship'] as const) expect(r[k], `${form} ${k}`).toBeGreaterThanOrEqual(base[k])
    }
  })
})

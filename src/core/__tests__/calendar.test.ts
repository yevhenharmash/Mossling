import { describe, expect, it } from 'vitest'
import { DAY, NIGHT_HOURS, SEASONS, WEATHER_ODDS, dayIndex, isNight, seasonAt, weatherAt, type Season, type Weather } from '../index'
import { at } from './helpers'

describe('seasons', () => {
  const north: [number, Season][] = [
    [1, 'winter'], [2, 'winter'], [3, 'spring'], [4, 'spring'], [5, 'spring'], [6, 'summer'],
    [7, 'summer'], [8, 'summer'], [9, 'autumn'], [10, 'autumn'], [11, 'autumn'], [12, 'winter'],
  ]

  it.each(north)('month %i is %s in the north', (month, season) => {
    expect(seasonAt(at(month, 15), 'north')).toBe(season)
  })

  it('the south is six months apart', () => {
    for (const [month, season] of north) {
      const opposite = north.find(([m]) => m === ((month + 5) % 12) + 1)![1]
      expect(seasonAt(at(month, 15), 'south'), `month ${month}`).toBe(opposite)
      expect(season).not.toBe(seasonAt(at(month, 15), 'south'))
    }
  })

  it('changes exactly at the month boundary', () => {
    expect(seasonAt(at(2, 28, 23, 59), 'north')).toBe('winter')
    expect(seasonAt(at(3, 1, 0, 0), 'north')).toBe('spring')
    expect(seasonAt(at(11, 30, 23, 59), 'north')).toBe('autumn')
    expect(seasonAt(at(12, 1), 'north')).toBe('winter')
  })
})

describe('night length follows the season', () => {
  const sample: Record<Season, number> = { winter: at(1, 10), spring: at(4, 10), summer: at(7, 10), autumn: at(10, 10) }

  it.each([...SEASONS])('%s: night starts and ends at its own hours', (season) => {
    const [start, end] = NIGHT_HOURS[season]
    const day = sample[season]
    const hour = (h: number, m = 0) => day + h * 3600_000 + m * 60_000
    expect(isNight(hour(start), 'north')).toBe(true)
    expect(isNight(hour(start - 1, 59), 'north')).toBe(false)
    expect(isNight(hour(end - 1, 59), 'north')).toBe(true)
    expect(isNight(hour(end), 'north')).toBe(false)
    expect(isNight(hour(12), 'north')).toBe(false)
    expect(isNight(hour(2), 'north')).toBe(true)
  })

  it('winter nights are longest, summer nights shortest', () => {
    const length = (s: Season) => (24 - NIGHT_HOURS[s][0]) + NIGHT_HOURS[s][1]
    expect(length('winter')).toBeGreaterThan(length('autumn'))
    expect(length('summer')).toBeLessThan(length('spring'))
  })

  it('20:30 in January is night in the north but summer evening in the south', () => {
    expect(isNight(at(1, 10, 20, 30), 'north')).toBe(true)
    expect(isNight(at(1, 10, 20, 30), 'south')).toBe(false)
  })
})

describe('days and weather', () => {
  it('dayIndex is stable within a local day and steps at midnight', () => {
    expect(dayIndex(at(5, 3, 0, 0))).toBe(dayIndex(at(5, 3, 23, 59)))
    expect(dayIndex(at(5, 4, 0, 0))).toBe(dayIndex(at(5, 3, 12)) + 1)
  })

  it('weather is the same all day, and varies across days', () => {
    const seen = new Set<Weather>()
    for (let d = 0; d < 60; d++) {
      const morning = at(10, 1) + d * DAY + 7 * 3600_000
      expect(weatherAt(morning, 'north')).toBe(weatherAt(morning + 14 * 3600_000, 'north'))
      seen.add(weatherAt(morning, 'north'))
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('every day of the year rolls a weather its season allows; snow only in winter', () => {
    const seenBySeason: Record<Season, Set<Weather>> = { spring: new Set(), summer: new Set(), autumn: new Set(), winter: new Set() }
    for (let d = 0; d < 365; d++) {
      const t = at(1, 1, 12) + d * DAY
      const season = seasonAt(t, 'north')
      const w = weatherAt(t, 'north')
      expect(WEATHER_ODDS[season][w], `${new Date(t).toISOString()} ${season} ${w}`).toBeGreaterThan(0)
      seenBySeason[season].add(w)
    }
    for (const s of SEASONS) expect(seenBySeason[s].size, s).toBeGreaterThanOrEqual(3)
    expect(seenBySeason.winter.has('snow')).toBe(true)
  })
})

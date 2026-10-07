import type { Hemisphere, Season, Weather } from './types'
import { DAY, NIGHT_HOURS, WEATHER_ODDS } from './tuning'
import { seededRandom, weightedPick } from './random'

const NORTH_SEASON_BY_MONTH: Season[] = [
  'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
  'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
]

/** Season by the local calendar at `t`. The south is six months apart. */
export function seasonAt(t: number, hemisphere: Hemisphere): Season {
  const month = new Date(t).getMonth()
  return NORTH_SEASON_BY_MONTH[hemisphere === 'north' ? month : (month + 6) % 12]
}

/** Night by the local clock at `t`; night length depends on the season. */
export function isNight(t: number, hemisphere: Hemisphere): boolean {
  const [start, end] = NIGHT_HOURS[seasonAt(t, hemisphere)]
  const h = new Date(t).getHours()
  return h >= start || h < end
}

/** Whole local calendar days since the epoch: stable within a day, +1 at local midnight. */
export function dayIndex(t: number): number {
  const d = new Date(t)
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY)
}

/** Today's weather: rolled once per local day from that season's odds. */
export function weatherAt(t: number, hemisphere: Hemisphere): Weather {
  const rand = seededRandom(dayIndex(t) * 7919 + 17)
  return weightedPick(WEATHER_ODDS[seasonAt(t, hemisphere)], rand)
}

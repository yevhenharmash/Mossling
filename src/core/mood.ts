import type { NeedKey, Pet } from './types'
import { walkPhase } from './sim'

export type Mood =
  | 'away'
  | 'walking'
  | 'atDoor'
  | 'asleep'
  | 'content'
  | 'restless'
  | 'hungry'
  | 'cold'
  | 'sleepy'
  | 'lonely'

/** Below this a need shows as a specific complaint. */
export const DISTRESS_BELOW = 30
/** Below this (but above distress) it is merely restless. */
export const CONTENT_FROM = 50

const NEED_MOOD: Record<NeedKey, Mood> = {
  fullness: 'hungry',
  warmth: 'cold',
  rest: 'sleepy',
  companionship: 'lonely',
}

export function lowestNeed(pet: Pet): { key: NeedKey; value: number } {
  const entries = Object.entries(pet.needs) as [NeedKey, number][]
  const [key, value] = entries.reduce((a, b) => (b[1] < a[1] ? b : a))
  return { key, value }
}

/** Expects a pet already simulated to `now`. */
export function moodOf(pet: Pet, now: number): Mood {
  if (pet.wanderedOffAt !== null) return 'away'
  const phase = walkPhase(pet, now)
  if (phase === 'out') return 'walking'
  if (phase === 'atDoor') return 'atDoor'
  if (pet.asleep) return 'asleep'
  const low = lowestNeed(pet)
  if (low.value < DISTRESS_BELOW) return NEED_MOOD[low.key]
  if (low.value < CONTENT_FROM) return 'restless'
  return 'content'
}

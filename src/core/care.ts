import type { Care, Coat, HideSpot, NeedKey, Pet } from './types'
import { HIDE_SPOTS, NEED_KEYS } from './types'
import { DISTRESS_BELOW } from './mood'
import { hashString, seededRandom } from './random'
import { preferencesOf } from './prefs'
import {
  CALL_WINDOW,
  COAT_RULES,
  FAVORITE_SPOT_CHANCE,
  HOUR,
  MESS_EVERY,
  MESS_GRACE,
  MESS_MAX,
  PLAY_ROUNDS,
} from './tuning'

// Calls, messes and care mistakes (DESIGN.md §6.9): the original's attention
// icon and droppings, made gentle. Mistakes never hurt it — they only shape
// which coat it grows into.

export function emptyCare(): Care {
  return { mistakes: 0, manners: 0 }
}

export function addMistake(p: Pet): void {
  p.care.mistakes += 1
  p.daily.mistakes += 1
}

/** The coat it grows when entering `stage`, from care in the stage before. */
export function coatFor(care: Care, stage: 'young' | 'grown'): Coat {
  const rule = COAT_RULES[stage]
  if (care.mistakes >= rule.wildFromMistakes) return 'wild'
  if (care.mistakes <= rule.glossyMaxMistakes && care.manners >= rule.glossyMinManners) return 'glossy'
  return 'mossy'
}

/** At home, awake and around: the only time it calls or makes a mess. */
function homeAndAwake(p: Pet): boolean {
  return p.wanderedOffAt === null && !p.asleep && !p.activity
}

/** Messes pile up with time awake at home. Called once per simulation step. */
export function makeMesses(p: Pet, from: number, to: number): void {
  if (!homeAndAwake(p)) return
  p.messClock += (to - from) / HOUR
  while (p.messClock >= MESS_EVERY) {
    p.messClock -= MESS_EVERY
    if (p.messes.length < MESS_MAX) p.messes.push({ at: to, late: false })
  }
}

/**
 * Brings calls and messes up to date at `t`: answered and expired calls close,
 * missed ones and old messes count as mistakes, and a need in distress calls.
 */
export function checkCare(p: Pet, t: number): void {
  for (const m of p.messes) {
    if (!m.late && t - m.at >= MESS_GRACE) {
      m.late = true
      addMistake(p)
    }
  }

  p.missedNeeds = p.missedNeeds.filter((k) => p.needs[k] < DISTRESS_BELOW)

  const call = p.call
  if (call) {
    if (!homeAndAwake(p)) p.call = null // asleep or out: it stops calling, no harm done
    else if (call.kind === 'need' && p.needs[call.need] >= DISTRESS_BELOW) p.call = null
    else if (t >= call.until) {
      p.call = null
      // Nobody came to tuck it in, so it curls up and dozes off by itself.
      if (call.kind === 'need' && call.need === 'rest') p.asleep = 'tired'
      else if (call.kind === 'need') {
        addMistake(p)
        p.missedNeeds.push(call.need)
      }
    }
  }

  // Real needs beat a fuss: a fib makes way for a genuine call.
  if ((!p.call || p.call.kind === 'fuss') && homeAndAwake(p)) {
    const low = NEED_KEYS.filter((k) => p.needs[k] < DISTRESS_BELOW && !p.missedNeeds.includes(k))
    if (low.length > 0) {
      const need = low.reduce<NeedKey>((a, b) => (p.needs[b] < p.needs[a] ? b : a), low[0])
      p.call = { kind: 'need', need, since: t, until: t + CALL_WINDOW }
    }
  }
}

/** Where it hides in each round of a game started at `startedAt`. Seeded, so the UI and the score agree. */
export function hidingSpots(petId: string, startedAt: number): HideSpot[] {
  const rand = seededRandom(hashString(petId) ^ Math.floor(startedAt / 1000))
  const favorite = preferencesOf(petId).favoriteSpot
  const others = HIDE_SPOTS.filter((s) => s !== favorite)
  return Array.from({ length: PLAY_ROUNDS }, () =>
    rand() < FAVORITE_SPOT_CHANCE ? favorite : others[Math.floor(rand() * others.length)],
  )
}
